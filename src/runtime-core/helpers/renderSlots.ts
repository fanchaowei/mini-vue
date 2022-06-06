import { h } from '../h'
import { Frangment } from '../VNode'

/**
 * 执行指定名称的插槽和作用域插槽
 * @param slots 总插槽对象
 * @param name 执行的插槽名称
 * @param props 传递的作用域插槽的参数，作用域插槽使用
 * @returns
 */
export function renderSlots(slots, name, props) {
  const slot = slots[name]
  if (typeof slot === 'function') {
    return h(Frangment, {}, slot(props))
  }
}
