
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
    el: null
  }

  return vnode
}