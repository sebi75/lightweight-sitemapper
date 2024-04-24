import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import resolve from "@rollup/plugin-node-resolve";
import { terser } from "rollup-plugin-terser";

const config = [
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.js",
      name: "lightweight-sitemapper",
      sourcemap: false,
    },
    external: ["zlib", "fast-xml-parser", "node-fetch"],
    plugins: [resolve(), typescript({ tsconfig: "./tsconfig.json" }), terser()],
  },
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.d.ts",
      format: "es",
    },
    plugins: [dts()],
  },
];

export default config;
