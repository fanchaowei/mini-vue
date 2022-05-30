
const publicPropertiesMap = {
  $el: (i) => i.vnode.el
}

export const publicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    const { setupState } = instance

    //如果 setup() 内存在该值，则返回
    if(key in setupState) {
      return setupState[key]
    }

    //是否传入的是特定的参数名，是的话返回对应的值
    const publicGetter = publicPropertiesMap[key]
    if(publicGetter) {
      return publicGetter(instance)
    }
  }
}