import { h } from "../../lib/guide-mini-vue.esm.js";

export const Foo = {
  name: "Foo",
  render() {
    return h("button", { onClick: this.clickBtn }, "click");
  },
  setup(props, { emit }) {
    const clickBtn = () => {
      emit("add");
    };

    return {
      clickBtn,
    };
  },
};
