/* imports */
import { WebServer } from "./modules/WebServer";
import { Application } from "./modules/Application";

/**
 * Start the WebServer
 * @param {Object} options - The server options.
 * @return {Application} The application interface.
 */
function serve(options) {
    const server = new WebServer(options);
    server.listen();

    return new Application(server);
}

/* export the server function */
export default serve;