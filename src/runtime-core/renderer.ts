import { isObject } from "../shared"
import { ShapeFlags } from "../shared/shapeFlags"
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
  //判断传入的是要生成 element 的对象还是，组件对象(包含render等)
  //要生成 element 的对象，type是要生成的虚拟节点的 html 标签类型，是字符串
  const { shapeFlags } = vnode
  if(shapeFlags & ShapeFlags.ELEMENT) {
    processElement(vnode, container)
  } else if(shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
    processComponent(vnode, container)
  }
}

//处理组件
function processComponent(vnode: any, container: any) {
  
  mountComponent(vnode, container)
}

//挂载组件
function mountComponent(initialVNode: any, container) {
  //创建组件对象实例，存储组件的一些必要的属性
  const instance = createComponentInstance(initialVNode)

  setupComponent(instance)
  setupRenderEffect(instance, initialVNode, container)
}

function setupRenderEffect(instance: any, initialVNode, container) {
  /**
   * 开箱，获取到组件内部的虚拟节点树
   * 此处通过 call() ，将 this 指向 instance.proxy ，目的是为了能通过 this 直接调用 setup() 返回的值
   */
  const { proxy } = instance
  const subTree = instance.render.call(proxy)

  patch(subTree, container)

  //将绑定在render()返回的根虚拟节点上的 element 绑定到组件虚拟节点上
  initialVNode.el = subTree.el
}
//处理 element
function processElement(vnode: any, container: any) {
  
  mountElement(vnode, container)
}
//挂载 element
function mountElement(vnode: any, container: any) {
  //此处的 vnode 是虚拟节点树的
  const el = (vnode.el = document.createElement(vnode.type))

  //vnode.children 包含该标签内的内容
  const { shapeFlags, children } = vnode
  if(shapeFlags & ShapeFlags.TEXT_CHILDREN) {
    //如果是字符串类型则直接传入
    el.textContent = children
  } else if(shapeFlags & ShapeFlags.ARRATY_CHILDREN) {
    //如果是数组类型，说明内部还有子节点标签，递归去添加子节点标签
    mountChildren(vnode, el)
  }

  //vnode.props 包含 html 元素的 attribute、prop和事件等
  const { props } = vnode
  for(const key in props) {
    const val = props[key]

    //判断是否是特定的事件名称：on + Event(注意事件名首字母大写)
    const isOn = (key) => /^on[A-Z]/.test(key)
    if(isOn(key)) {
      //获取事件名，并添加事件
      const event = key.slice(2).toLowerCase()
      el.addEventListener(event, val)
    } else {
      el.setAttribute(key, val)
    }
  }

  container.append(el)
}

//递归循环
function mountChildren(vnode, container) {
  vnode.children.forEach((item) => {
    patch(item, container)
  })
}

