import { h } from "../../lib/guide-mini-vue.esm.js";

export const Foo = {
  render() {
    return h("div", {}, "this is foo. get " + this.count);
  },
  setup(props) {
    console.log(props);
    props.count++;
    console.log(props);
  },
};
