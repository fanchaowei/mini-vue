import { render } from "./renderer"
import { createVNode } from "./VNode"

/**
 * 文档解释：返回一个提供应用上下文的应用实例。应用实例挂载的整个组件树共享同一个上下文
 * @param rootComponent 根组件，传入的是要生成节点的对象，组件对象，内包含 render() 等
 */
export function createApp(rootComponent) {

  return {
    /**
     * 文档解释：所提供 DOM 元素的 innerHTML 将被替换为应用根组件的模板渲染结果
     * @param rootContainer 根容器，当前传入的是 element 对象
     */
    mount(rootContainer) {
      //这里会将输入的组件转换为vnode(虚拟节点)
      //后续所有操作都基于 vnode

      //将组件转化为虚拟节点
      const vnode = createVNode(rootComponent)
      
      render(vnode, rootContainer)
    }
  }
}