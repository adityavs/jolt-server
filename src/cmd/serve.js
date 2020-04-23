/* imports */
import { WebServer } from "../modules/WebServer";

/**
 * Starts the WebServer.
 * @param {Object} args - The command line arguments.
 * @private
 */
function serve(args) {
    const server = new WebServer(args);
    server.listen(() => {
        console.log(`Serving "${server.root}" on port ${server.port}`);
    });
}

export default serve;