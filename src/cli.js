/* imports */
import { Parser } from "./utils/Parser";
import version from "./cmd/version";
import help from "./cmd/help";
import serve from "./cmd/serve";

/* parse the cli arguments */
const args = Parser.parseCLIArgs(process.argv.slice(2));

/* determine what action to run */
if (args.version || args.v) version(args);
else if (args.help || args.h) help(args);
else serve(args);


