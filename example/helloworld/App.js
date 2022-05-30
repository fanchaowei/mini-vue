import { h } from "../../lib/guide-mini-vue.esm.js";

window.self = null;
export const App = {
  render() {
    window.self = this;
    return h(
      "div",
      { id: "root" },
      // [
      //   h("div", { class: "red" }, "子节点1"),
      //   h("div", { class: "blue" }, "子节点2"),
      // ]
      "hi, " + this.msg
    );
  },

  setup() {
    return {
      msg: "helloworld",
    };
  },
};
