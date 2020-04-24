/* imports */
import fs from "fs";
import os from "os";
import path from "path";
import { WebSocket } from "./sockets/WebSocket";

/**
 * The Code to be Injected
 * @type {string}
 * @private
 */
const INJECTED_CODE = fs.readFileSync(path.normalize(path.join(__dirname, "../injected.html")), "utf8");

/**
 * Enables LiveReload Functionality
 * @class
 * @private
 */
export class LiveReload {

    /**
     * Enables live reloading.
     * @param {WebServer} server - The web server to connect to.
     */
    static enable(server) {
        LiveReload._wss = new WebSocket(server.httpServer);

        const options = (["darwin", "win32"].includes(os.platform())) ? { recursive: true } : {};

        fs.watch(server.root, options, (event, filename) => {
            if (filename) {
                if (LiveReload._fsWait) return;

                const cssChange = (path.extname(filename) == ".css");
                LiveReload._fsWait = setTimeout(() => {
                    LiveReload._fsWait = false;
                }, 100);

                const reloadType = cssChange ? "updatecss" : "reload";

                for (let socket of LiveReload._wss.connections) {
                    socket.send(reloadType);
                }
            }
        });
    }

    /**
     * Injects the code into the requested html file.
     * @param {string} pathname - The file path.
     * @param {Response} res - The response object.
     */
    static injectSnippet(pathname, res) {
        const injectCandidates = [
            new RegExp("</body>", "i"),
            new RegExp("</head>", "i")
        ];

        let injectTag = null;

        const contents = fs.readFileSync(pathname, "utf8");
        for (let i = 0; i < injectCandidates.length; ++i) {
            const match = injectCandidates[i].exec(contents);
            if (match) {
                injectTag = match[0];
                break;
            }
        }

        if (injectTag) {
            const data = contents.replace(injectTag, INJECTED_CODE + injectTag);

            res.setHeader("Content-type", "text/html");
            res.end(data);
        }
    }
}

LiveReload._wss = null;
LiveReload._fsWait = false;
