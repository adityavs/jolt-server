/**
 * the Help Menu
 * @type {Object}
 * @private
 */
const helpMap = {

    main: `
    Usage: jolt-server <options>

    Options:
        -v, --version ........ Logs the version of jolt-server.
        -h, --help ........... Logs the help menu.
        -p, --port ........... Sets the server's port.
        -r, --root ........... Sets the folder to serve static assets from.
        -f, --file ........... Sets the default file to serve.
        -l, --live ........... Enables live reloading.
        -s, --silent ......... Disables request logging.
        --spa ................ Enables Push State routing support.
    `,
};

/**
 * Logs the help menu.
 * @param {Object} args - The command line arguments.
 * @private
 */
function help(args) {
    let subCmd = args._[0] == "help" ? args._[1] : args._[0];
    console.log(helpMap[subCmd] || helpMap.main);
}

export default help;