import { h } from "../../lib/guide-mini-vue.esm.js";
import { Foo } from "./Foo.js";

export const App = {
  name: "App",
  render() {
    return h("div", {}, [h("div", {}, "div1"), h(Foo, { onAdd: "clickAdd" })]);
  },
  setup() {
    const clickAdd = () => {
      console.log("@@@");
    };

    return {
      clickAdd,
    };
  },
};
