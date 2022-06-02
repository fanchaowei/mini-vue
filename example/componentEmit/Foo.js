import { h } from "../../lib/guide-mini-vue.esm.js";

export const Foo = {
  name: "Foo",
  render() {
    return h("button", { onClick: this.clickBtn }, "click");
  },
  setup(props, { emit }) {
    const clickBtn = () => {
      emit("add", 1, 2);
      emit("add-foo");
    };

    return {
      clickBtn,
    };
  },
};
