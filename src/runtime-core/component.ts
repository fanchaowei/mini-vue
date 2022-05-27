//组件对象实例
export function createComponentInstance(vnode) {
 const component = {
   vnode,
   type: vnode.type
 }

 return component
}

export function setupComponent(instance) {
  //TODO
  //initProps
  //initSlots

  setupStatefulComponent(instance)
}

export function setupStatefulComponent(instance) {
  //这里拿到createApp(App)传入的App参数
  const Component = instance.type
  //获取其中的setup
  const { setup } = Component

  if(setup) {
    /**
     * setup()会返回 function 或者 object
     * 返回 function：是组件的 runner 函数
     * 返回 object：会把这个对象注入到当前组件的上下文中
     */
    const setupResult = setup()

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

