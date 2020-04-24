/* imports */
import crypto from "crypto";

/**
 * The HTTP upgrade key
 * @type {string}
 * @private
 */
const MAGIC_KEY = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

/**
 * Handles Socket Operations
 * @class
 * @private
 * 
 */
export class Connection {

    /**
     * @param {WebSocket} socket - The socket connection.
     * @param {Requset} req - The Request connected to the socket.
     */
    constructor(socket, req) {
        this._socket = socket;
        this._req = req;

        this._binaryType = "nodebuffer";
        this._readyState = 0;

        this._fin = false;
        this._rsv1 = null;
        this._rsv2 = null;
        this._rsv3 = null;

        this._opCode = 0x00;
        this._payloadLength = 0;
        this._mask = false;
        this._maskingKey = 0;

        this._buffers = [];
        this._payloads = [];
        this._bufferedBytes = 0;
        this._frameReadState = 0;
    }

    /**
     * Sends data to the client.
     * @param {string} data - the data to send to the client.
     */
    send(data) {
        this._socket.write(this._createPacket({
            opCode: typeof data == "string" ? 0x01 : 0x2,
            payload: data
        }));
    }

    /** Closes the socket connection */
    close() {
        this._socket.end();
        this._readyState = 2;
    }

    /**
     * Consume and process the bytes.
     * @param {number} n - The number of bytes to process.
     * @return {Buffer} The Buffer containing the processed bytes.
     * @private
     */
    _consume(n) {
        this._bufferedBytes -= n;

        const destination = Buffer.alloc(n);
        while (n > 0) {
            const buffer = this._buffers[0];

            if (n < buffer.length) {
                buffer.copy(destination, destination.length - n, 0, n);
                this._buffers[0] = buffer.slice(n);
            } else {
                this._buffers.shift().copy(destination, destination.length - n);
            }

            n -= buffer.length;
        }

        return destination;
    }

    /** Upgrades the HTTP request to a WebSocket Connection. */
    doHandShake() {
        const acceptKey = this._req.headers["sec-websocket-key"];
        const generatedKey = crypto.createHash("sha1").update(acceptKey + MAGIC_KEY).digest("base64");

        const headers = [
            "HTTP/1.1 101 Websocket Protocol Upgrade",
            "Sec-Websocket-Accept:" + generatedKey,
            "Connection: Upgrade",
            "Upgrade: Websocket"
        ];

        this._socket.write(headers.join("\r\n") + "\r\n\r\n");
        this._readyState = 1;
    }

    /** Adds socket event listeners to the connection. */
    addSocketListeners() {
        this._socket.on("error", (error) => { this.close(); });

        this._socket.on("close", () => {
            this._readyState = 3;
            this._frameReadState = 500;
            this._payloads = [];
            this._buffers = [];

            this._socket.on("data", function () { return false; });
            this._socket.on("close", function () { return false; });

            this.onclose();
        });

        this._socket.on("data", (buffer) => {
            this._buffers.push(buffer);
            this._bufferedBytes += buffer.byteLength;
            this._startReadLoop();
        });
    }

    /**
     * Parses the incoming message data.
     * @private
     */
    _parseMessage() {
        const message = Buffer.concat(this._payloads);
        this._payloads = [];

        if (this._opCode == 0x01) {
            this.onmessage(message.toString());
        } else if (this._opCode == 0x02) {
            if (this._binaryType == "nodebuffer") this.onmessage(message);
            else this.onmessage(this._toArrayBuffer(message));
        }
    }

    /**
     * Handles the control frame packets.
     * @private
     */
    _handleControlFrame() {
        if (this._opCode = 0xA) {
            this.onpong();
        } else if (this._opCode == 0x08) {
            this.close();
        }
    }

    /**
     * Process the packets into the message.
     * @return {boolean} Did the process end in a success?
     * @private
     */
    _startReadLoop() {
        for (; ;) {
            let bytes = null;

            switch (this._frameReadState) {

                case 0:
                    if (this._bufferedBytes < 2) return false;

                    bytes = this._consume(2);

                    this._fin = bytes[0] & 0x80;
                    this._rsv1 = bytes[0] & 0x40;
                    this._rsv2 = bytes[0] & 0x20;
                    this._rsv3 = bytes[0] & 0x10;

                    this._opCode = bytes[0] & 0x0f;
                    this._mask = bytes[1] & 0x80;
                    this._payloadLength = bytes[1] & 0x7f;

                    const isFragmented = this._payloads.length > 0;

                    if (this._opCode > 0x07) {
                        if (!this._fin) return this.close();
                        else if (this._payloadLength > 125) return this.close();
                    } else if (this._opCode == 0x00 && !isFragmented) {
                        return this.close();
                    }

                    this._frameReadState = 1;

                case 1:

                    if (this._payloadLength === 126) {
                        if (this._bufferedBytes < 2) return false;
                        bytes = this._consume(2);
                        this._payloadLength = bytes.readUInt16BE(0);
                    } else if (this._payloadLength == 127) {
                        if (this._bufferedBytes < 8) return false;
                        bytes = this._consume(8);
                        this._payloadLength = Math.pow(2, 32) * bytes.readUInt32BE(0) + bytes.readUInt32BE(4);
                    }

                    this._frameReadState = 2;

                case 3:

                    if (this._mask) {
                        if (this._bufferedBytes < 4) return false;
                        this._maskingKey = this._consume(4);
                    }

                    this._frameReadState = 3;

                case 3:

                    if (this._bufferedBytes < this._payloadLength) return false;
                    this._frameReadState = 0;

                    if (this._opCode > 0x07) {
                        return this._handleControlFrame();
                    }

                    let payload = this._consume(this._payloadLength);

                    if (this._mask) {
                        for (let i = 0; i < this._payloadLength; i++) {
                            payload[i] ^= this._maskingKey[i % 4];
                        }
                    }

                    this._payloads.push(payload);

                    if (this._fin) {
                        this._parseMessage();
                    }

                    break;

                default: return true;
            }
        }
    }

    /**
     * Converts a buffer into an ArrayBuffer.
     * @param {Buffer} buf - The buffer to convert.
     * @return {ArrayBuffer} The new ArrayBuffer.
     * @private
     */
    _toArrayBuffer(buf) {
        if (buf.byteLength == buf.buffer.byteLength) return buf.buffer;
        else return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    }

    /**
     * Converts a ArrayBuffer into a Node Buffer.
     * @param {ArrayBuffer} data - The buffer to convert.
     * @return {Buffer} - The new Buffer.
     * @private
     */
    _toNodeBuffer(data) {
        if (Buffer.isBuffer(data)) {
            return data;
        } else if (ArrayBuffer.isView(data)) {
            const result = Buffer.from(data.buffer);

            if (result.byteLength == data.byteLength) {
                return result;
            } else {
                return result.slice(data.byteOffset, data.byteOffset, data.byteLength);
            }
        } else {
            return Buffer.from(data);
        }
    }

    /**
     * Creates a packet of data to send over the network.
     * @param {Object} param - The data to send.
     * @return {Buffer} The data buffer.
     * @private
     */
    _createPacket({ payload, opCode }) {
        const buffer = this._toNodeBuffer(payload);
        const byteLength = buffer.byteLength;
        const payloadLength = byteLength;
        let n = 0;

        if (payloadLength > 125) {
            if (payloadLength < 65536) {
                payloadLength = 126;
                n += 2;
            } else {
                payloadLength = 127;
                n += 8;
            }
        }

        const header = Buffer.alloc(n + 2);

        header[0] = 0x80;
        header[0] |= opCode;
        header[1] = payloadLength;

        if (payloadLength == 126) {
            header.writeUInt16BE(byteLength, 2);
        } else if (payloadLength == 127) {
            header.writeUInt32BE(byteLength, 2 + 4);
        }

        return Buffer.concat([header, buffer]);
    }

    onopen() { }
    onmessage() { }
    onclose() { }
    onpong() { }
    onerror() { }
}