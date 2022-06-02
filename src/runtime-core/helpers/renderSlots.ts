import { h } from "../h"

/**
 * 执行指定名称的插槽
 * @param slots 总插槽对象
 * @param name 执行的插槽名称
 * @param props 传递的作用域插槽的参数
 * @returns
 */
export function renderSlots(slots, name, props) {
  const slot = slots[name]
  if (typeof slot === "function") {
    return h("div", {}, slot(props))
  }
}
