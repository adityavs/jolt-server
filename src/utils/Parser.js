/**
 * Parser Utilities
 * @class
 * @private
 */
export class Parser {

    /**
     * Parses the CLI arguments.
     * @param {Object} args - The command line arguments.
     * @return {Object} The parsed command line arguments.
     */
    static parseCLIArgs(args) {
        const tmp = {};
        tmp._ = [];

        let arg = null;
        let newArg = [];

        for (let i = 0; i < args.length; i++) {
            arg = args[i];
            newArg = [];

            if (arg.startsWith("-") && !arg.startsWith("--")) {
                arg = arg.replace(/-/g, "--");
            }

            if (arg.startsWith("--")) {
                newArg.push(arg.slice(2));
                const tmpArg = args[i + 1];

                if (tmpArg != null && !tmpArg.startsWith("--")) {
                    newArg.push(tmpArg);
                    args.slice(args.indexOf(tmpArg), 1);
                } else {
                    newArg.push(true);
                }
                tmp[newArg[0]] = newArg[1];
            } else {
                tmp._.push(arg);
            }
        }

        return tmp;
    }

    /**
     * Checks if an argument exists in the command line.
     * @param {string} name - The argument name.
     * @param {Object} args - The command line arguments.
     * @return {boolean} If the argument exists.
     */
    static argExists(name, alt, args) {
        return (args[name]) || (args[alt]) ? true : false;
    }
}