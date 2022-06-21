import { effect } from '../reactivity/effect'
import { EMPTY_OBJ } from '../shared'
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
    remove: hostRemove,
    setElementhost: hostSetElementText,
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
    if (!n1) {
      //初始化
      mountElement(n2, container, parentComponent)
    } else {
      //更新 element
      patchElement(n1, n2, container, parentComponent)
    }
  }
  //处理更新
  function patchElement(n1, n2, container, parentComponent) {
    console.log('patchElement')
    console.log('n1', n1)
    console.log('n2', n2)

    /**
     * props 修改
     */
    // 获取新旧 props
    const oldProps = n1.props || EMPTY_OBJ
    const newProps = n2.props || EMPTY_OBJ
    // 将 n1 的 el 挂载到新的 n2 上
    const el = (n2.el = n1.el)

    patchProps(el, oldProps, newProps)

    /**
     * children 修改
     */
    patchChildren(n1, n2, el, parentComponent)
  }

  // 更新虚拟 DOM ,处理 children
  function patchChildren(n1: any, n2: any, container: any, parentComponent) {
    const prevShapeFlags = n1.shapeFlags
    const nextShapeFlages = n2.shapeFlags
    const c1 = n1.children
    const c2 = n2.children

    // 判断新的虚拟节点的 children 是否为文本
    if (nextShapeFlages & ShapeFlags.TEXT_CHILDREN) {
      // 判断旧的虚拟节点的 children 是否为数组
      if (prevShapeFlags & ShapeFlags.ARRATY_CHILDREN) {
        // 卸载旧的
        unmountedChildren(n1.children)
      }
      // 这里的判断主要是为了 text 与 text 的判断, 因为数组和 text 一定为 true。 所以重构写到了一起。
      if (c1 !== c2) {
        // 添加新的
        hostSetElementText(container, n2.children)
      }
    } else {
      if (prevShapeFlags & ShapeFlags.TEXT_CHILDREN) {
        hostSetElementText(container, '')
        mountChildren(n2.children, container, parentComponent)
      }
    }
  }
  // 卸载是数组的 children
  function unmountedChildren(children: any) {
    // 循环 children 数组,将一个个 children 的 element 对象传入 hostRemove 进行卸载
    for (const key in children) {
      const el = children[key].el
      hostRemove(el)
    }
  }

  //处理 props
  function patchProps(el, oldProps, newProps) {
    if (oldProps !== newProps) {
      // 循环新的 props
      for (const key in newProps) {
        const prevProp = oldProps[key]
        const nextProp = newProps[key]

        // 如果新旧值不相等，则修改
        if (prevProp !== nextProp) {
          // 修改调用之前封装的设置 props 的方法。
          hostPatchProp(el, key, prevProp, nextProp)
        }
      }
    }
    if (oldProps !== EMPTY_OBJ) {
      // 循环旧的 props ，将新的 props 内没有的删除
      for (const key in oldProps) {
        if (!(key in newProps)) {
          hostPatchProp(el, key, oldProps[key], null)
        }
      }
    }
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
      mountChildren(vnode.children, el, parentComponent)
    }

    //vnode.props 包含 html 元素的 attribute、prop和事件等
    const { props } = vnode
    for (const key in props) {
      const val = props[key]
      //配置 attribute
      hostPatchProp(el, key, null, val)
    }
    //添加到主容器
    hostInsert(el, container)
  }

  //递归循环 children
  function mountChildren(children, container, parentComponent) {
    children.forEach((item) => {
      patch(null, item, container, parentComponent)
    })
  }

  //只渲染 children 虚拟节点，插槽使用。需根据输入的特定参数。
  function processFrangment(n1: any, n2: any, container: any, parentComponent) {
    //调用循环 children 的函数
    mountChildren(n2.children, container, parentComponent)
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
