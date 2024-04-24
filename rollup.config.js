import typescript from "@rollup/plugin-typescript";
import { terser } from "rollup-plugin-terser";
import dts from "rollup-plugin-dts";
import resolve from "@rollup/plugin-node-resolve";

const config = [
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.js",
      format: "umd",
      name: "lightweight-sitemapper",
      sourcemap: false,
    },
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
