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
    patch(null, vnode, container, null, null)
  }
  /**
   *
   * @param n1 旧的虚拟节点
   * @param n2 现在的虚拟节点
   * @param container
   * @param parentComponent
   */
  function patch(n1, n2, container, parentComponent, anthor) {
    //判断传入的是要生成 element 的对象还是，组件对象(包含render等)
    //要生成 element 的对象，type是要生成的虚拟节点的 html 标签类型，是字符串
    const { type, shapeFlags } = n2
    //判断类型是否是特定的参数类型，如果是则走特定的方法，否者走正常的组件或 element 判断。
    switch (type) {
      case Frangment:
        processFrangment(n1, n2, container, parentComponent, anthor)
        break
      case Text:
        processText(n1, n2, container)
        break
      default:
        if (shapeFlags & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent, anthor)
        } else if (shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(n1, n2, container, parentComponent, anthor)
        }
        break
    }
  }

  //处理组件
  function processComponent(
    n1: any,
    n2: any,
    container: any,
    parentComponent,
    anthor
  ) {
    mountComponent(n2, container, parentComponent, anthor)
  }

  //挂载组件
  function mountComponent(
    initialVNode: any,
    container,
    parentComponent,
    anthor
  ) {
    //创建组件对象实例，存储组件的一些必要的属性
    const instance = createComponentInstance(initialVNode, parentComponent)

    setupComponent(instance)
    setupRenderEffect(instance, initialVNode, container, anthor)
  }

  function setupRenderEffect(instance: any, initialVNode, container, anthor) {
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
        patch(null, subTree, container, instance, anthor)

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
        patch(prevSubTree, subTree, container, instance, anthor)
      }
    })
  }
  //处理 element
  function processElement(
    n1: any,
    n2: any,
    container: any,
    parentComponent,
    anthor
  ) {
    if (!n1) {
      //初始化
      mountElement(n2, container, parentComponent, anthor)
    } else {
      //更新 element
      patchElement(n1, n2, container, parentComponent, anthor)
    }
  }
  //处理更新
  function patchElement(n1, n2, container, parentComponent, anthor) {
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
    patchChildren(n1, n2, el, parentComponent, anthor)
  }

  // 更新虚拟 DOM ,处理 children
  function patchChildren(
    n1: any,
    n2: any,
    container: any,
    parentComponent,
    anthor
  ) {
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
        mountChildren(n2.children, container, parentComponent, anthor)
      } else {
        patchKeyedChildren(c1, c2, container, parentComponent, anthor)
      }
    }
  }
  // 处理新旧都是数组的情况，使用 diff 算法
  function patchKeyedChildren(
    c1: Array<any>,
    c2: Array<any>,
    container,
    parentComponent,
    parentAnthor
  ) {
    // 创建标记
    // i 从新旧数组的第一位开始，向后移动。而 e1、e2 代表新旧数组的最后一位，操作时向前移动。
    let i = 0
    const l2 = c2.length
    let e1 = c1.length - 1
    let e2 = l2 - 1

    // 判断是否是相同的虚拟节点
    function isSameVnodeType(n1, n2) {
      return n1.type === n2.type && n1.key === n2.key
    }

    // 正向检索，通过 i++ 去找到新旧数组前面相同的位数
    while (i <= e1 && i <= e2) {
      const n1 = c1[i]
      const n2 = c2[i]
      if (isSameVnodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, parentAnthor)
      } else {
        break
      }
      i++
    }

    // 反向检索，通过 e1,e2 的值找到尾部相同的位数
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1]
      const n2 = c2[e2]
      if (isSameVnodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, parentAnthor)
      } else {
        break
      }
      e1--
      e2--
    }

    // 当进行完上面的循环，i 小于等于 e2，大于 e1 则新的数组比老的数组长，需要新增
    if (i > e1) {
      if (i <= e2) {
        //找到锚点 anthor，要插入的数据就插入到该锚点之前，如果数据是向后添加的，则锚点为 null
        const nextPos = e2 + 1
        const anthor = nextPos < l2 ? c2[nextPos].el : null
        //i 和 e2 差了几位，则就是新增了几个，所以循环遍历，知道 i 与 e2 相等
        while (i <= e2) {
          // 调用 patch ，最终会在 mountElement 函数的 hostInsert 中进行新增
          patch(null, c2[i], container, parentComponent, anthor)
          i++
        }
      }
    }
    // 同理，当 i 大于 e2，小于等于 e1 时，则老的数组比新的数组长，需要删除
    else if (i > e2) {
      while (i <= e1) {
        // 删除操作
        hostRemove(c1[i].el)
        i++
      }
    }
    // 处理两端相同中间不同的
    else {
      // 下方遍历使用的标记
      const s1 = i
      const s2 = i

      // 新的数组中修改区域的长度
      const toBePatched = e2 - s2 + 1
      // 记录更新了多少个，每次在 patch 更新后都自增长，一旦它的值与 toBePatched 相等，则说明 dom 更新完毕。
      let patched = 0
      /**
       * 新老数组内虚拟节点的对应关系, 默认全为 0
       * 只有新旧数组都有的虚拟节点才有值，倘若是新增的则 value 为 0
       * key-value: 新数组需要修改的区域虚拟节点的顺序 - 当前新数组虚拟节点在老数组中的位置
       */
      const newIndexToOldIndexMap = new Array(toBePatched).fill(0)
      // 是否需要进行虚拟节点移动, true 为需要
      let moved = false
      // 在循环时记录上一位虚拟节点的位置，用于确认是否将 moved 改为 true
      let maxNewIndexSoFar = 0

      // 创建一张新数组的映射地图，映射地图包含的部分是新的与旧的不同的部分。
      const keyToNewIndexMap = new Map()
      for (i = s2; i <= e2; i++) {
        // 将不同的部分存入
        const nextChild = c2[i]
        keyToNewIndexMap.set(nextChild.key, i)
      }
      // 循环旧数组，开始对数据进行处理
      for (i = s1; i <= e1; i++) {
        const prevChild = c1[i]

        if (patched >= toBePatched) {
          // 如果两值相等，说明新的数组包含的 DOM 数据更新已经完成，所以旧数组剩下的全都进行删除
          hostRemove(prevChild.el)
          continue
        }

        // 代表本次循环的单个虚拟节点如果存在在新的数组中，其位置标识是多少
        let newIndex
        if (!!prevChild.key) {
          // 如果存在虚拟节点存在 key 则从映射地图中取值并赋值。
          newIndex = keyToNewIndexMap.get(prevChild.key)
        } else {
          // 如果不存在 key 则去循环新的数组查找
          for (let j = s2; j <= e2; j++) {
            if (isSameVnodeType(prevChild, c2[j])) {
              newIndex = j
            }
          }
        }

        if (!newIndex) {
          // 倘若不存在 newIndex ，说明新数组中不存在该虚拟节点，将该虚拟节点对应的 element 标签对象删除
          hostRemove(prevChild.el)
        } else {
          /**
           * 判断现在的位置是否大于上一位。倘若无需移动，则现在的位置绝对大于上一位的位置。
           */
          if (newIndex > maxNewIndexSoFar) {
            // 倘若是的则把现在的位置赋值给标记
            maxNewIndexSoFar = newIndex
          } else {
            // 证明有移动
            moved = true
          }

          /**
           * 对新旧数组的对应关系赋值
           * 为什么要 i + 1 ？因为可能出现赋值的 i 是 0 (第一位)的情况，这会与其他是 0 (新增的)搞混，所以都 +1
           * 为什么 newIndex - s2 ? 因为 newIndex 内计算的位数还包含了新数组不变的 s2 长度，所以要减去那一部分的长度
           */
          newIndexToOldIndexMap[newIndex - s2] = i + 1
          // 倘若存在则传入 patch，然后通过 patchElement 函数再去处理他们的 props 和 children
          patch(prevChild, c2[newIndex], container, parentComponent, null)
        }
      }

      // 获取无需移动的虚拟节点的位置, 让若 moved 为 false ，则给个空数组
      const increasingNewIndexSequence = moved
        ? getSequence(newIndexToOldIndexMap)
        : []
      // 长度计数，用于下面循环调用时，判断无需移动的虚拟节点是否全循环到了
      let j = increasingNewIndexSequence.length - 1
      // 循环新数组需要修改区域的长度的次数
      for (let i = toBePatched - 1; i >= 0; i--) {
        // 确认锚点,因为反向循环，所以我们从需要变动区域后面的第一位无需变动的虚拟节点开始，一位一位往前设置锚点。
        const nextIndex = i + s2
        const nextChild = c2[nextIndex]
        const anthor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null

        // 倘若值为 0 说明是需要新增的新虚拟节点
        if (newIndexToOldIndexMap[i] === 0) {
          patch(null, nextChild, container, parentComponent, anthor)
        } else if (moved) {
          // 如果 j 小于 0 ，说明无需移动位置的全执行完了，后续的全都是需要移动位置的
          // 如果 i 不与 increasingNewIndexSequence 数组中对应，说明是需要移动的
          if (j < 0 || increasingNewIndexSequence[j] !== i) {
            // 需要移动的虚拟节点进行添加
            hostInsert(nextChild.el, container, anthor)
          } else {
            j--
          }
        }
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
  function mountElement(vnode: any, container: any, parentComponent, anthor) {
    //此处的 vnode 是虚拟节点树的
    const el = (vnode.el = hostCreateELement(vnode.type))

    //vnode.children 包含该标签内的内容
    const { shapeFlags, children } = vnode
    if (shapeFlags & ShapeFlags.TEXT_CHILDREN) {
      //如果是字符串类型则直接传入
      el.textContent = children
    } else if (shapeFlags & ShapeFlags.ARRATY_CHILDREN) {
      //如果是数组类型，说明内部还有子节点标签，递归去添加子节点标签
      mountChildren(vnode.children, el, parentComponent, anthor)
    }

    //vnode.props 包含 html 元素的 attribute、prop和事件等
    const { props } = vnode
    for (const key in props) {
      const val = props[key]
      //配置 attribute
      hostPatchProp(el, key, null, val)
    }
    //添加到主容器
    hostInsert(el, container, anthor)
  }

  //递归循环 children
  function mountChildren(children, container, parentComponent, anthor) {
    children.forEach((item) => {
      patch(null, item, container, parentComponent, anthor)
    })
  }

  //只渲染 children 虚拟节点，插槽使用。需根据输入的特定参数。
  function processFrangment(
    n1: any,
    n2: any,
    container: any,
    parentComponent,
    anthor
  ) {
    //调用循环 children 的函数
    mountChildren(n2.children, container, parentComponent, anthor)
  }
  //当只有文字时，通过 dom 操作直接生成，并添加到容器内
  function processText(n1: any, n2: any, container: any) {
    const { children } = n2
    const textNode = (n2.el = document.createTextNode(children))
    container.append(textNode)
  }

  return {
    // 导出 createApp
    createApp: createAppApi(render),
  }
}
/**
 * 通过传入的数组，输出正向排布的不需要变动位置的数组
 * 例如：[2, 3, 0, 5, 6, 9] -> [ 0, 1, 3, 4, 5 ]
 * 上面例子代表：原数组的第 0, 1, 3, 4, 5 位是正向增长的，无需移动位置
 * @param arr
 * @returns
 */
function getSequence(arr) {
  const p = arr.slice()
  const result = [0]
  let i, j, u, v, c
  const len = arr.length
  for (i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      j = result[result.length - 1]
      if (arr[j] < arrI) {
        p[i] = j
        result.push(i)
        continue
      }
      u = 0
      v = result.length - 1
      while (u < v) {
        c = (u + v) >> 1
        if (arr[result[c]] < arrI) {
          u = c + 1
        } else {
          v = c
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1]
        }
        result[u] = i
      }
    }
  }
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }
  return result
}
