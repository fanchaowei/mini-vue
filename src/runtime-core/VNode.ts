import { ShapeFlags } from '../shared/shapeFlags'

/**
 * 创建虚拟节点
 * @param type 要生成节点的对象，内包含 render() 等
 * @param props
 * @param children
 * @returns
 */
export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
    el: null,
    shapeFlags: getShapeFlags(type), //类型信息字段
  }

  // 通过运算符的 | 的用法，进行赋值。这里赋值 children 的类型
  if (typeof vnode.children === 'string') {
    vnode.shapeFlags |= ShapeFlags.TEXT_CHILDREN
  } else if (Array.isArray(vnode.children)) {
    vnode.shapeFlags |= ShapeFlags.ARRATY_CHILDREN
  }

  if (vnode.shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
    if (typeof vnode.children === 'object') {
      vnode.shapeFlags |= ShapeFlags.SLOT_CHILDREN
    }
  }

  return vnode
}

//先赋上值，这里返回的是当前虚拟节点的类型
function getShapeFlags(type: any) {
  return typeof type === 'string'
    ? ShapeFlags.ELEMENT
    : ShapeFlags.STATEFUL_COMPONENT
}
