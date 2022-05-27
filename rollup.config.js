import typescript from "@rollup/plugin-typescript";

export default {
  //入口
  input: "./src/index.ts",
  //出口
  output: [
    {
      format: "cjs", //commonJS
      file: "lib/guide-mini-vue.cjs.js",
    },
    {
      format: "esm",
      file: "lib/guide-mini-vue.esm.js",
    },
  ],
  plugins: [typescript()],
};
