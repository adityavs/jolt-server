/* imports */
import http from "http";
import https from "https";
import fs from "fs";
import url from "url";
import path from "path";
import MIME_TYPES from "../constants/MimeTypes";
import { Parser } from "../utils/Parser";
import { LiveReload } from "./LiveReload";

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
        this._httpServer = null;
        this._protocol = "http";
        this._fragments = [];

        this._endpoints = {};
        this._parsedEndpoints = this._parseEndpoints();
        this._endpointsParameters = {};

        this._root = Parser.argExists("root", "r", args) ? args.root || args.r : process.cwd();
        this._file = Parser.argExists("file", "f", args) ? args.file || args.f : "index.html";
        this._port = Parser.argExists("port", "p", args) ? args.port || args.p : 3000;
        this._spa = Parser.argExists("spa", "s", args);
        this._live = Parser.argExists("live", "l", args);

        this._key = Parser.argExists("key", null, args) ? args.key : false;
        this._cert = Parser.argExists("cert", null, args) ? args.cert : false;
    }

    /** Starts the WebServer. */
    listen() {
        this._httpServer = this._createServer((req, res) => {

            /* handle custom endpoints specified by the user */
            const endpoint = this._resolveEndpoint(req.url);

            if (!endpoint) {
                /* handle the request internally */
                if (this._live && req.url == "/reload") {
                    LiveReload.register(res);
                } else {
                    this._handleRequest(req, res);
                }
                return;
            }

            if (req.method == endpoint.method) {
                req.params = this._endpointsParameters;
                endpoint.callback(req, res);
            }
        });

        /* start the web server */
        this._httpServer.listen(this._port, () => {
            console.log(`Serving "${this._root}" at ${this._protocol}://localhost:${this._port}`);
        });


        /* enable live reloading */
        if (this._live) {
            LiveReload.enable(this);
        }
    }

    /** refresh the server endpoints */
    refreshEndpoints() {
        this._parsedEndpoints = this._parseEndpoints();
    }

    /**
     * Creates the server with https if available and fallsback to http.
     * @param {function} callback - The callback to run when a request occurs.
     * @return {http.Server} The http server.
     * @private
     */
    _createServer(callback) {
        if (this._key && this._cert) {
            try {
                const options = { key: fs.readFileSync(this._key), cert: fs.readFileSync(this._cert) };
                this._protocol = "https";

                return https.createServer(options, callback);
            } catch {
                console.error("Failed to load SSL certificate.");

                return http.createServer(callback);

            }
        }

        return http.createServer(callback);
    }

    /**
     * Handles the HTTP requests.
     * @param {http.ClientRequest} req - The request object.
     * @param {http.ServerResponse} res - The response object.
     * @private
     */
    _handleRequest(req, res) {
        /* get the url's pathname */
        let pathname = path.join(this._root, path.normalize(url.parse(req.url).pathname));

        if (this._spa) {

            if (!pathname.includes(".")) {
                this._fragments = req.url.split("/");

                if (this._live) {
                    LiveReload.inject(path.join(this._root, this._file), res);
                    return;
                }

                this._serveFile(path.join(this._root, this._file), res);

            } else {
                for (let fragment of this._fragments) {
                    pathname = pathname.replace(fragment, "");
                }
                this._serveFile(path.normalize(pathname), res);


            }

        } else {

            fs.stat(pathname, (error, stats) => {
                if (error) {
                    if (error.errno == -2) {
                        res.statusCode = 404;
                        res.end(`ERROR 404: ${error.path} was not found.`);
                    } else {
                        res.statusCode = 500;
                        res.end(error.message);
                    }
                    return;
                }

                if (stats.isDirectory()) {
                    pathname = path.join(pathname, this._file);
                }

                if (this._live) {
                    if (pathname.endsWith(".html") || pathname.endsWith(".htm")) {
                        LiveReload.inject(pathname, res);
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
     * @param {http.ServerResponse} res - The HTTP response.
     * @private
     */
    _serveFile(filename, res) {
        fs.readFile(filename, (error, data) => {
            if (error) {
                if (error.errno == -2) {
                    res.statusCode = 404;
                    res.end(`ERROR 404: ${error.path} was not found.`);
                } else {
                    res.statusCode = 500;
                    res.end(error.message);
                }
                return;
            }

            const ext = path.parse(filename).ext;
            res.setHeader("Content-type", MIME_TYPES[ext] || "text/plain");
            res.end(data);
        });
    }

    /**
     * Parse the endpoint url parameters
     * @return {Object} The parsed endpoints.
     * @private
     */
    _parseEndpoints() {
        return Object.keys(this._endpoints)
            .sort((a, b) => { return b.length - a.length; })
            .map((path) => {
                return {
                    url: new RegExp("^" + path.replace(/:[^\s/]+/g, '([\\w-]+)') + "$"),
                    view: this._endpoints[path],
                    pathname: path
                }
            });
    }
    
    /**
     * Resolve an endpoint by its url
     * @param {string} url - The endpoint's url.
     * @return {Object} The resolved endpoint.
     * @private
     */
    _resolveEndpoint(url) {
        let regex = null;

        for(let endpoint of this._parsedEndpoints) {
            regex = url.match(endpoint.url);
            if(regex) {
                this._endpointsParameters = this._getEndpointParameters(endpoint, regex);
                return this._endpoints[endpoint.pathname];
            }
        }

        return null;
    }

    /**
     * Get the endpoint's parameters.
     * @param {Object} endpoint - The endpoint to get parameters for.
     * @param {Regex} regex - The endpoints' url regex.
     * @private
     */
    _getEndpointParameters(endpoint, regex) {
        const params = {};
        const fragments = endpoint.pathname.split("/");
        let index = 1;

        for(let fragment of fragments) {
            if(fragment.startsWith(":")) {
                params[fragment.substring(1)] = regex[index];
                index++;
            }
        }

        return params;
    }
}