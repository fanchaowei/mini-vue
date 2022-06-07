import { ShapeFlags } from '../shared/shapeFlags'
import { createComponentInstance, setupComponent } from './component'
import { Frangment, Text } from './VNode'

/**
 * render只调用patch方法，方便后续递归的处理
 * @param vnode 虚拟节点
 * @param container 容器
 */
export function render(vnode, container) {
  patch(vnode, container, null)
}

function patch(vnode, container, parentComponent) {
  //判断传入的是要生成 element 的对象还是，组件对象(包含render等)
  //要生成 element 的对象，type是要生成的虚拟节点的 html 标签类型，是字符串
  const { type, shapeFlags } = vnode
  //判断类型是否是特定的参数类型，如果是则走特定的方法，否者走正常的组件或 element 判断。
  switch (type) {
    case Frangment:
      processFrangment(vnode, container, parentComponent)
      break
    case Text:
      processText(vnode, container)
      break
    default:
      if (shapeFlags & ShapeFlags.ELEMENT) {
        processElement(vnode, container, parentComponent)
      } else if (shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
        processComponent(vnode, container, parentComponent)
      }
      break
  }
}

//处理组件
function processComponent(vnode: any, container: any, parentComponent) {
  mountComponent(vnode, container, parentComponent)
}

//挂载组件
function mountComponent(initialVNode: any, container, parentComponent) {
  //创建组件对象实例，存储组件的一些必要的属性
  const instance = createComponentInstance(initialVNode, parentComponent)

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

  patch(subTree, container, instance)

  //将绑定在render()返回的根虚拟节点上的 element 绑定到组件虚拟节点上
  initialVNode.el = subTree.el
}
//处理 element
function processElement(vnode: any, container: any, parentComponent) {
  mountElement(vnode, container, parentComponent)
}
//挂载 element
function mountElement(vnode: any, container: any, parentComponent) {
  //此处的 vnode 是虚拟节点树的
  const el = (vnode.el = document.createElement(vnode.type))

  //vnode.children 包含该标签内的内容
  const { shapeFlags, children } = vnode
  if (shapeFlags & ShapeFlags.TEXT_CHILDREN) {
    //如果是字符串类型则直接传入
    el.textContent = children
  } else if (shapeFlags & ShapeFlags.ARRATY_CHILDREN) {
    //如果是数组类型，说明内部还有子节点标签，递归去添加子节点标签
    mountChildren(vnode, el, parentComponent)
  }

  //vnode.props 包含 html 元素的 attribute、prop和事件等
  const { props } = vnode
  for (const key in props) {
    const val = props[key]

    //判断是否是特定的事件名称：on + Event(注意事件名首字母大写)
    const isOn = (key) => /^on[A-Z]/.test(key)
    if (isOn(key)) {
      //获取事件名，并添加事件
      const event = key.slice(2).toLowerCase()
      el.addEventListener(event, val)
    } else {
      el.setAttribute(key, val)
    }
  }

  container.append(el)
}

//递归循环 children
function mountChildren(vnode, container, parentComponent) {
  vnode.children.forEach((item) => {
    patch(item, container, parentComponent)
  })
}

//只渲染 children 虚拟节点，插槽使用。需根据输入的特定参数。
function processFrangment(vnode: any, container: any, parentComponent) {
  //调用循环 children 的函数
  mountChildren(vnode, container, parentComponent)
}
//当只有文字时，通过 dom 操作直接生成，并添加到容器内
function processText(vnode: any, container: any) {
  const { children } = vnode
  const textNode = (vnode.el = document.createTextNode(children))
  container.append(textNode)
}
