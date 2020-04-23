/* imports */
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { terser } from "rollup-plugin-terser";
import { builtinModules } from "module";

/* build config */
export default [
    {
        input: "src/cli.js",
        output: {
            file: "dist/cli.js",
            format: "cjs",
        },
        plugins: [
            resolve(),
            commonjs(),
            json(),
            terser({
                output: {
                    preamble: "#!/usr/bin/env node"
                }
            })
        ],
        external: builtinModules
    },
    {
        input: "src/api.js",
        output: [
            { file: "dist/api.cjs.js", format: "cjs", banner: "/* Copyright (c) 2020 Outwalk Studios */" },
            { file: "dist/api.esm.js", format: "esm", banner: "/* Copyright (c) 2020 Outwalk Studios */" }
        ],
        plugins: [
            resolve(),
            commonjs()
        ]
    }
]