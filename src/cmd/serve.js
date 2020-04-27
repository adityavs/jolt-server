/* imports */
import { WebServer } from "../modules/WebServer";

/**
 * Starts the WebServer.
 * @param {Object} args - The command line arguments.
 * @private
 */
function serve(args) {
    new WebServer(args).listen();
}

export default serve;