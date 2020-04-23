const helpMap = {

    main: `
    Usage: jolt-server <options>

    Options:
        -v, --version ........ Logs the version of jolt-server.
        -h, --help ........... Logs the help menu.
        -p, --port ........... Sets the server's port.
        -r, --root ........... Sets the folder to serve static assets from.
        -f, --file ........... Sets the default file to serve.
        --spa ................ Enables Push State routing support.
        --noreload ........... Disables live reloading.
    
    `,
};

function help(args) {
    let subCmd = args._[0] == "help" ? args._[1] : args._[0];
    console.log(helpMap[subCmd] || helpMap.main);
}

export default help;