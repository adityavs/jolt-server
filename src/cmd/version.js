/* imports */
import { version as v } from "../../package.json";

async function version() {
    console.log(`v${v}`);
}

export default version;