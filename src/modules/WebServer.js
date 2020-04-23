/* imports */
import http from "http";
import fs from "fs";
import url from "url";
import path from "path";
import { Parser } from "../utils/Parser";

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
        this.root = Parser.argExists("root", args) ? args.root : process.cwd();
        this.file = Parser.argExists("file", args) ? args.file : "index.html";
        this.port = Parser.argExists("port", args) ? args.port : 3000;
        this.spa = Parser.argExists("spa", args);
        this.live = Parser.argExists("live", args);
        this.silent = Parser.argExists("silent", args);
    }

    /**
     * Starts the WebServer.
     * @param {function} [callback] - The callback for when the server starts.
     */
    listen(callback) {
        this.httpServer = http.createServer((req, res) => {
            this._handleRequest(req, res);
            if (!this.silent) console.log(`${req.method} ${req.url}`);
        });

        /* connect live reloading */

        this.httpServer.listen(this.port, callback);
    }

    /**
     * Handles the HTTP requests.
     * @param {Request} req - The request object.
     * @param {Response} res - The response object.
     * @private
     */
    _handleRequest(req, res) {
        const parsedUrl = url.parse(req.url);
        const sanitizePath = path.normalize(parsedUrl.pathname).replace(/^(\.\.[\/\\])+/, '');
        let pathname = path.join(this.root, sanitizePath);

        if (fs.existsSync(pathname)) {
            if (fs.statSync(pathname).isDirectory()) {
                pathname += `/${this.file}`;
            }

            /* inject code */

            /* try to serve the reqed static file */
            this._serveFile(pathname, res);
        } else {
            if (!this.spa) {
                res.statusCode = 404;
                res.end(`ERROR 404: ${pathname} not found.`);
                return;
            }

            const spaPath = `${this.root}/${this.file}`;

            /* inject code */

            /* try to serve the spa file */
            this._serveFile(spaPath, res);

        }
    }

    /**
     * Serves a static file.
     * @param {string} filename - The file's name.
     * @param {Response} res - The HTTP response.
     * @private
     */
    _serveFile(filename, res) {
        try {
            const data = fs.readFileSync(filename);
            const ext = path.parse(filename).ext;
            res.setHeader("Content-type", MIME_TYPES[ext]);
            res.end(data);
        } catch (error) {
            res.statusCode = 500;
            res.end(error.message);
        }
    }
}