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
    }

    /** Starts the WebServer. */
    listen() {
        this.httpServer = this._createServer((req, res) => {
            if (this.live && req.url == "/reload") {
                LiveReload.enable(this, res);
            } else {
                this._handleRequest(req, res);
            }
        });

        this.httpServer.listen(this.port, () => {
            console.log(`Serving "${this.root}" at ${this.protocol}://localhost:${this.port}`);
        });
    }

    /**
     * Creates the server with https if available and fallsback to http.
     * @param {function} callback - The callback to run when a request occurs.
     * @return {http.Server} The http server.
     * @private
     */
    _createServer(callback) {
        if(this.key && this.cert) {
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
                pathname = path.normalize(pathname);
                if (fs.existsSync(pathname)) {
                    this._serveFile(pathname, res);
                } else {
                    res.statusCode = 404;
                    res.end(`ERROR 404: ${pathname} not found.`);
                }
            }

        } else {

            if (fs.existsSync(pathname)) {

                if (fs.statSync(pathname).isDirectory()) {
                    pathname = path.join(pathname, this.file);
                }

                if (this.live) {
                    if (pathname.endsWith(".html") || pathname.endsWith(".htm")) {
                        LiveReload.injectSnippet(pathname, res);
                        return;
                    }
                }

                this._serveFile(pathname, res);
            } else {
                res.statusCode = 404;
                res.end(`ERROR 404: ${pathname} not found.`);
            }

        }
    }

    /**
     * Resolve the path when the path does not exist.
     * (Used for SPA routing)
     * @param {string} pathname - The pathname to resolve.
     */
    _resolvePath(pathname) {
        const fragments = pathname.split("/");
        let resolvedPath = "";
        for (let fragment of fragments) {
            if (fs.existsSync(path.join(this.root, resolvedPath, fragment))) {
                resolvedPath = path.join(resolvedPath, fragment);
            }
        }

        if (resolvedPath.includes(".")) {
            return resolvedPath;
        }

        return resolvedPath + fragments[fragments.length - 1];
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
                res.statusCode = 500;
                res.end(error.message);
                return;
            }

            const ext = path.parse(filename).ext;
            res.setHeader("Content-type", MIME_TYPES[ext]);
            res.end(data);
        });
    }
}