import { proxyRefs } from '../reactivity'
import { shallowReadonly } from '../reactivity/reactive'
import { emit } from './componentEmit'
import { initProps } from './componentProps'
import { publicInstanceProxyHandlers } from './componentPublicInstance'
import { initSlots } from './componentSlots'

//全局变量，用于赋值内部组件实例
let currentInstance = null

//组件对象实例
export function createComponentInstance(vnode, parent) {
  const component = {
    vnode,
    type: vnode.type,
    setupState: {},
    props: {},
    slots: {},
    emit: () => {},
    parent, //父级的组件对象实例
    provides: parent ? parent.provides : {},
    isMounted: false, // 是否是第一次调用(初始化)，false 为第一次调用。
    subTree: {}, // 虚拟节点树
    next: null, // 接下来要更新的虚拟节点
  }

  /**
   * 绑定 emit 函数
   * bind() 函数第一位绑定 this ，第二位绑定第一个参数
   * 这里固定第一个参数是组件虚拟节点，这样用户只需要输入 event 参数即可
   */
  component.emit = emit.bind(null, component) as any

  return component
}

export function setupComponent(instance) {
  initProps(instance, instance.vnode.props)
  initSlots(instance, instance.vnode.children)

  setupStatefulComponent(instance)
}

export function setupStatefulComponent(instance) {
  //这里拿到createApp(App)传入的App参数
  const Component = instance.type

  //绑定一个proxy代理，这是给后续能通过 this 直接调用 setup() 内返回的值准备
  instance.proxy = new Proxy({ _: instance }, publicInstanceProxyHandlers)

  //获取其中的setup
  const { setup } = Component

  if (setup) {
    /**
     * 赋值全局变量内部组件实例
     * 为什么在这里赋值？因为 currentInstance 的值需要随着不同的组件变化，故在 setup 之前赋值最稳妥
     */
    setCurrentInstance(instance)

    /**
     * setup() 会返回 function 或者 object
     * 返回 function：是组件的 runner 函数
     * 返回 object：会把这个对象注入到当前组件的上下文中
     * 在 setup() 函数内输入 props 作为参数，使 setup() 内能使用 props 传入的值
     */
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit,
    })

    //赋值完后重置
    setCurrentInstance(null)

    //对返回值进行处理
    handleSetupResult(instance, setupResult)
  }
}
//处理setupResult
function handleSetupResult(instance: any, setupResult: any) {
  //TODO function

  // 将 setup() 的返回值如果是对象，就把该对象挂载到组件对象实例上，这样 render() 中就可以调用到
  if (typeof setupResult === 'object') {
    // 嵌套 proxyRefs 的原因：
    // 如果 setup() 内的数据里有 ref 对象，通过 proxyRefs() 嵌套后不需要 .value 来取值。
    instance.setupState = proxyRefs(setupResult)
  }

  finishComponentSetup(instance)
}

function finishComponentSetup(instance: any) {
  // 拿到createApp(App)传入的App参数
  const Component = instance.type
  // 将参数内需要生成的虚拟节点的函数挂载到组件对象实例上
  // 走 template 转 render 函数需要 compiler 存在以及 Component.render 不存在。
  // 因为如果 Component.render 存在，则优先级是最高的。就直接赋值 Component.render 了
  if (compiler && !Component.render) {
    // 存在 Component.template 才能进行转换
    if (Component.template) {
      Component.render = compiler(Component.template)
    }
  }

  instance.render = Component.render
}

//输出内部组件实例，也是官方接口
export function getCurrentInstance() {
  return currentInstance
}
//对全局内部组件实例进行赋值
function setCurrentInstance(instance) {
  currentInstance = instance
}

let compiler
// 获得 template 转 render 的函数
export function registerRuntimeCompiler(_compiler) {
  compiler = _compiler
}
