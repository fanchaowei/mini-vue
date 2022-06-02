import { ShapeFlags } from '../shared/shapeFlags'

//处理插槽
export function initSlots(instance, children) {
  const { vnode } = instance
  if (vnode.shapeFlags & ShapeFlags.SLOT_CHILDREN) {
    normalizeObjectSlots(children, instance.slots)
  }
}

function normalizeObjectSlots(children, slots) {
  //循环 children 对象，为 instance 的 slots 赋值。
  for (const key in children) {
    const value = children[key]
    //因为作用域插槽需要传 props ，此处写成方法。
    slots[key] = (props) => normalizeSlotValue(value(props))
  }
}

//判断是否为数组，不是则转为数组
function normalizeSlotValue(value) {
  return Array.isArray(value) ? value : [value]
}
