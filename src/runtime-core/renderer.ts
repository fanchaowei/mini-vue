import { effect } from '../reactivity/effect'
import { ShapeFlags } from '../shared/shapeFlags'
import { createComponentInstance, setupComponent } from './component'
import { createAppApi } from './createApp'
import { Frangment, Text } from './VNode'

/**
 * 将 renderer 封装成一个闭包，方便扩展。
 * 目前是为了 createRenderer 自定义渲染器，方便渲染到不同的环境下，例如：dom 下或 canvas 下。
 * @param options 包含的扩展配置,可以直接通过该参数去自定义配置，以达成不同的环境的需求。
 * @returns
 */
export function createRenderer(options) {
  const {
    createElement: hostCreateELement,
    patchProp: hostPatchProp,
    insert: hostInsert,
  } = options

  /**
   * render只调用patch方法，方便后续递归的处理
   * @param vnode 虚拟节点
   * @param container 容器
   */
  function render(vnode, container) {
    patch(null, vnode, container, null)
  }
  /**
   *
   * @param n1 旧的虚拟节点
   * @param n2 现在的虚拟节点
   * @param container
   * @param parentComponent
   */
  function patch(n1, n2, container, parentComponent) {
    //判断传入的是要生成 element 的对象还是，组件对象(包含render等)
    //要生成 element 的对象，type是要生成的虚拟节点的 html 标签类型，是字符串
    const { type, shapeFlags } = n2
    //判断类型是否是特定的参数类型，如果是则走特定的方法，否者走正常的组件或 element 判断。
    switch (type) {
      case Frangment:
        processFrangment(n1, n2, container, parentComponent)
        break
      case Text:
        processText(n1, n2, container)
        break
      default:
        if (shapeFlags & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent)
        } else if (shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(n1, n2, container, parentComponent)
        }
        break
    }
  }

  //处理组件
  function processComponent(n1: any, n2: any, container: any, parentComponent) {
    mountComponent(n2, container, parentComponent)
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
     * 因为生成 element 对象并进行 DOM 渲染时，会调用到 instance.render。
     * 而需要页面更新的页面内，render 内必然会使用到 setup 内定义的响应式的变量。
     * 所以通过 effect 包裹，即可在响应式变量改变时，重新去触发生成 element 对象和操作 DOM ，实现页面的响应式更新。
     */
    effect(() => {
      // 判断是否是初始化
      if (!instance.isMounted) {
        //初始化
        /**
         * 开箱，获取到组件内部的虚拟节点树
         * 此处通过 call() ，将 this 指向 instance.proxy ，目的是为了能通过 this 直接调用 setup() 返回的值
         */
        const { proxy } = instance
        const subTree = (instance.subTree = instance.render.call(proxy))

        //第四个参数传入父组件的实例对象
        patch(null, subTree, container, instance)

        //将虚拟节点树生成的 element 对象绑定到组件虚拟节点上
        initialVNode.el = subTree.el
        //初始化结束，isMounted 改为 true
        instance.isMounted = true
      } else {
        //更新

        const { proxy } = instance
        // 生成本次的虚拟节点树
        const subTree = instance.render.call(proxy)
        // 获取前一次的虚拟节点树
        const prevSubTree = instance.subTree
        // 将本次生成的虚拟节点树替换
        instance.subTree = subTree
        //因为需要检测更新，对新旧虚拟节点树做对比，所以 patch 函数内将新旧虚拟节点树都传入
        patch(prevSubTree, subTree, container, instance)
      }
    })
  }
  //处理 element
  function processElement(n1: any, n2: any, container: any, parentComponent) {
    mountElement(n2, container, parentComponent)
  }
  //挂载 element
  function mountElement(vnode: any, container: any, parentComponent) {
    //此处的 vnode 是虚拟节点树的
    const el = (vnode.el = hostCreateELement(vnode.type))

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
      //配置 attribute
      hostPatchProp(el, key, val)
    }
    //添加到主容器
    hostInsert(el, container)
  }

  //递归循环 children
  function mountChildren(vnode, container, parentComponent) {
    vnode.children.forEach((item) => {
      patch(null, item, container, parentComponent)
    })
  }

  //只渲染 children 虚拟节点，插槽使用。需根据输入的特定参数。
  function processFrangment(n1: any, n2: any, container: any, parentComponent) {
    //调用循环 children 的函数
    mountChildren(n2, container, parentComponent)
  }
  //当只有文字时，通过 dom 操作直接生成，并添加到容器内
  function processText(n1: any, n2: any, container: any) {
    const { children } = n2
    const textNode = (n2.el = document.createTextNode(children))
    container.append(textNode)
  }

  return {
    //导出 createApp
    createApp: createAppApi(render),
  }
}
