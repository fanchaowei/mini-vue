import { createComponentInstance, setupComponent } from "./component"

/**
 * render只调用patch方法，方便后续递归的处理
 * @param vnode 虚拟节点
 * @param container 容器
 */
export function render(vnode, container) {

  patch(vnode, container)
}

function patch(vnode, container) {
 processComponent(vnode, container)
}

//处理组件
function processComponent(vnode: any, container: any) {
  
  mountComponent(vnode, container)
}

//挂载组件
function mountComponent(vnode: any, container) {
  //创建组件对象实例，存储组件的一些必要的属性
  const instance = createComponentInstance(vnode)

  setupComponent(instance)
  setupRenderEffect(instance, container)
}

function setupRenderEffect(instance: any, container) {
  //生成虚拟节点树
  const subTree = instance.render()

  patch(subTree, container)
}

