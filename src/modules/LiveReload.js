/* imports */
import fs from "fs";
import os from "os";
import path from "path";

/**
 * The Code to be Injected
 * @type {string}
 * @private
 */
const INJECTED_CODE = `
<!-- Code injected by jolt-server -->
<script>
    const source = new EventSource("/reload");
    const reload = () => window.location.reload();
    source.onmessage = reload;
    source.onerror = () => (source.onopen = reload);
</script>
`;

/**
 * Enables LiveReload Functionality
 * @class
 * @private
 */
export class LiveReload {

    /**
     * Enables live reloading.
     * @param {WebServer} server - The web server to connect to.
     * @param {Response} res - The response to use.
     */
    static enable(server, res) {
        res.writeHead(200, {
            "Content-type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        });

        LiveReload._connections.push(res);

        if(!LiveReload._enabled) {
            LiveReload.watch(server.root, (event, filename) => {
                if(filename) {
                    if(LiveReload._fsWait) return;

                    LiveReload._fsWait = setTimeout(() => {
                        LiveReload._fsWait = false;
                    }, 100);

                    for(let connection of LiveReload._connections) {
                        connection.write("data: reload\n\n");
                        LiveReload._connections.slice(LiveReload._connections.indexOf(connection), 1);
                    }
                }
            });

            LiveReload._enabled = true;
        }
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

        fs.readFile(pathname, "utf8", (error, data) => {
            if(error) {
                if (error.errno == -2) {
                    res.statusCode = 404;
                    res.end(`ERROR 404: ${error.path} not found.`);
                } else {
                    res.statusCode = 500;
                    res.end(error.message);
                }
                return;
            }

            for (let i = 0; i < injectCandidates.length; ++i) {
                const match = injectCandidates[i].exec(data);
                if (match) {
                    injectTag = match[0];
                    break;
                }
            }
    
            if (injectTag) {
                res.setHeader("Content-type", "text/html");
                res.end(data.replace(injectTag, INJECTED_CODE + injectTag));
            }
        });
    }

    /**
     * Watches a file or directory for changes.
     * @param {string} target - The file or directory to watch.
     * @param {function} callback - The callback to use.
     */
    static watch(target, callback) {
        if (!["darwin", "win32"].includes(os.platform())) {
            if (fs.statSync(target).isDirectory()) {
                fs.watch(target, callback);
                fs.readdirSync(target).forEach((entry) => {
                    LiveReload.watch(`${path}/${entry}`, callback);
                });
            }
        } else {
            fs.watch(target, { recursive: true }, callback);
        }
    }
}
LiveReload._connections = [];
LiveReload._enabled = false;
LiveReload._fsWait = false;
