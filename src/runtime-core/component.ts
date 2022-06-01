import { shallowReadonly } from "../reactivity/reactive"
import { initProps } from "./componentProps"
import { publicInstanceProxyHandlers } from "./componentPublicInstance"

//组件对象实例
export function createComponentInstance(vnode) {
 const component = {
   vnode,
   type: vnode.type,
   setupState: {},
   props: {}
 }

 return component
}

export function setupComponent(instance) {
  //TODO
  //initSlots

  initProps(instance, instance.vnode.props)

  setupStatefulComponent(instance)
}

export function setupStatefulComponent(instance) {
  //这里拿到createApp(App)传入的App参数
  const Component = instance.type

  //绑定一个proxy代理，这是给后续能通过 this 直接调用 setup() 内返回的值准备
  instance.proxy = new Proxy({ _: instance }, publicInstanceProxyHandlers)

  //获取其中的setup
  const { setup } = Component

  if(setup) {
    /**
     * setup() 会返回 function 或者 object
     * 返回 function：是组件的 runner 函数
     * 返回 object：会把这个对象注入到当前组件的上下文中
     * 在 setup() 函数内输入 props 作为参数，使 setup() 内能使用 props 传入的值
     */
    const setupResult = setup(shallowReadonly(instance.props))

    //对返回值进行处理
    handleSetupResult(instance, setupResult)
  }
}
//处理setupResult
function handleSetupResult(instance: any, setupResult: any) {
  //TODO function

  //如果是对象，就把对象挂载到组件对象实例上
  if(typeof setupResult === 'object') {
    instance.setupState = setupResult
  }

  finishComponentSetup(instance)
}

function finishComponentSetup(instance: any) {
  //拿到createApp(App)传入的App参数
  const Component = instance.type
  //将参数内需要生成的虚拟节点的函数挂载到组件对象实例上
  if(Component.render) {
    instance.render = Component.render
  }
}
