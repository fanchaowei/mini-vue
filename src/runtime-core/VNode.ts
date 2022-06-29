import { ShapeFlags } from '../shared/shapeFlags'

//创建插槽渲染 children 虚拟节点的唯一标识。
export const Frangment = Symbol('Frangment')
//创建插槽渲染只输入文字的唯一标识
export const Text = Symbol('Text')

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
    key: props && props.key,
    el: null, // 当前虚拟节点的 element 对象
    shapeFlags: getShapeFlags(type), // 类型信息字段
    component: null, // 当前虚拟节点的组件实例对象
  }

  // 通过运算符的 | 的用法，进行赋值。这里赋值 children 的类型
  if (typeof vnode.children === 'string') {
    vnode.shapeFlags |= ShapeFlags.TEXT_CHILDREN
  } else if (Array.isArray(vnode.children)) {
    vnode.shapeFlags |= ShapeFlags.ARRATY_CHILDREN
  }
  //判断是否存在插槽，条件：是组件虚拟对象节点并且其 children 是一个对象类型
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

// 创建只输入文字的虚拟节点
export function createTextVNode(text: string) {
  return createVNode(Text, {}, text)
}
