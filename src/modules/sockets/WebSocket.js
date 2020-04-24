/* imports */
import { Connection } from "./Connection";

/**
 * Creates a WebSocket Connection
 * @class
 * @private
 */
export class WebSocket {

    /**
     * @param {http.Server} httpServer - The HTTP Server.
     */
    constructor(httpServer) {
        this.connections = [];
        this._initialize(httpServer);
    }

    /**
     * initialize the websocket connection.
     * @param {http.Server} httpServer - The HTTP Server.
     * @private
     */
    _initialize(httpServer) {
        httpServer.on("upgrade", (req, socket) => {
            if (req.headers["upgrade"] != "websocket") return false;

            const connection = new Connection(socket, req);
            this.connections.push(connection);

            connection.doHandShake();
            connection.addSocketListeners();

            socket.on("close", () => {
                const i = this.connections.indexOf(connection);
                if (i > -1) this.connections.splice(i, 1);
            });

            this.onconnection(connection);
        });
    }

    onconnection() { }
}