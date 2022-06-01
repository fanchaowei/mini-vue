import { h } from "../../lib/guide-mini-vue.esm.js";
import { Foo } from "./Foo.js";

export const App = {
  render() {
    return h(
      "div",
      {
        id: "root",
        onClick: () => {
          console.log("you click it.");
        },
      },
      [
        h("div", { class: "red" }, "子节点1"),
        h("div", { class: "blue" }, "子节点2"),
        h(Foo, { count: 1 }),
      ]
    );
  },

  setup() {
    return {
      msg: "helloworld",
    };
  },
};
