/* imports */
import http from "http";
import https from "https";
import fs from "fs";
import url from "url";
import path from "path";
import { Parser } from "../utils/Parser";
import { LiveReload } from "./LiveReload";

/**
 * Map of Mime Types
 * @type {Object}
 * @private
 */
const MIME_TYPES = {
    ".ico": "image/x-icon",
    ".html": "text/html",
    ".htm": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".png": "image/png",
    ".jpg": "image/jpg",
    ".gif": "image/gif",
    ".json": "application/json",
    ".xml": "application/xml",
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".woff": "application/font-woff",
    ".ttf": "application/font-ttf",
    ".eot": "application/vnd.ms-fontobject",
    ".otf": "application/font-otf",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".doc": "application/msword"
};

/**
 * Creates a WebServer to serve files from.
 * @class
 * @private
 */
export class WebServer {

    /**
     * @param {Object} args - The command lines arguments.
     */
    constructor(args) {
        this.httpServer = null;
        this.currentRouteFragments = [];
        this.protocol = "http";

        this.root = Parser.argExists("root", "r", args) ? args.root || args.r : process.cwd();
        this.file = Parser.argExists("file", "f", args) ? args.file || args.f : "index.html";
        this.port = Parser.argExists("port", "p", args) ? args.port || args.p : 3000;
        this.spa = Parser.argExists("spa", "s", args);
        this.live = Parser.argExists("live", "l", args);

        this.key = Parser.argExists("key", null, args) ? args.key : false;
        this.cert = Parser.argExists("cert", null, args) ? args.cert : false;

        /* API only options */
        this.handler = Parser.argExists("handler", null, args) ? args.handler : false;
    }

    /** Starts the WebServer. */
    listen() {
        this.httpServer = this._createServer((req, res) => {
            if (this.handler instanceof Function) {
                this.handler(req, res);
                if(res.writableEnded || res.finished) {
                    return;
                }
            }

            if (this.live && req.url == "/reload") {
                LiveReload.enable(this, res);
            } else {
                this._handleRequest(req, res);
            }
        });

        this.httpServer.listen(this.port, () => {
            console.log(`Serving "${this.root}" at ${this.protocol}://localhost:${this.port}`);
        });

        return this.httpServer;
    }

    /**
     * Creates the server with https if available and fallsback to http.
     * @param {function} callback - The callback to run when a request occurs.
     * @return {http.Server} The http server.
     * @private
     */
    _createServer(callback) {
        if (this.key && this.cert) {
            try {
                const options = this._loadCredintials(this.key, this.cert);
                this.protocol = "https";
                return https.createServer(options, callback);
            } catch {
                console.error("Failed to load SSL certificate.");
                return http.createServer(callback);
            }
        } else {
            return http.createServer(callback);
        }
    }

    /**
     * Loads the HTTPS key and cert files.
     * @param {string} key - The key filename.
     * @param {string} cert - The cert filename.
     * @return {Object} The credintials config.
     * @private
     */
    _loadCredintials(key, cert) {
        return {
            key: fs.readFileSync(key),
            cert: fs.readFileSync(cert)
        };
    }

    /**
     * Handles the HTTP requests.
     * @param {Request} req - The request object.
     * @param {Response} res - The response object.
     * @private
     */
    _handleRequest(req, res) {
        const parsedUrl = url.parse(req.url);
        const sanitizedPath = path.normalize(parsedUrl.pathname).replace(/^(\.\.[\/\\])+/, '');
        let pathname = path.join(this.root, sanitizedPath);

        if (this.spa) {

            if (!pathname.includes(".")) {
                this.currentRouteFragments = req.url.split("/");

                if (this.live) {
                    LiveReload.injectSnippet(path.join(this.root, this.file), res);
                    return;
                }

                this._serveFile(path.join(this.root, this.file), res);
            } else {
                for (let fragment of this.currentRouteFragments) {
                    pathname = pathname.replace(fragment, "");
                }
                this._serveFile(path.normalize(pathname), res);


            }

        } else {

            fs.stat(pathname, (error, stats) => {
                if (error) {
                    console.error(error.message);
                    return;
                }

                if (stats.isDirectory()) {
                    pathname = path.join(pathname, this.file);
                }

                if (this.live) {
                    if (pathname.endsWith(".html") || pathname.endsWith(".htm")) {
                        LiveReload.injectSnippet(pathname, res);
                        return;
                    }
                }

                this._serveFile(pathname, res);
            });
        }
    }

    /**
     * Serves a static file.
     * @param {string} filename - The file's name.
     * @param {Response} res - The HTTP response.
     * @private
     */
    _serveFile(filename, res) {
        fs.readFile(filename, (error, data) => {
            if (error) {
                if (error.errno == -2) {
                    res.statusCode = 404;
                    res.end(`ERROR 404: ${error.path} not found.`);
                } else {
                    res.statusCode = 500;
                    res.end(error.message);
                }
                return;
            }

            const ext = path.parse(filename).ext;
            res.setHeader("Content-type", MIME_TYPES[ext]);
            res.end(data);
        });
    }
}