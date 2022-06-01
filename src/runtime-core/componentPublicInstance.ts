
const publicPropertiesMap = {
  $el: (i) => i.vnode.el
}

export const publicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    const { setupState, props } = instance

    const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key)
    if(hasOwn(setupState,key)) {
      //如果 setup() 内存在该值，则返回
      return setupState[key]
    } else if(hasOwn(props,key)) {
      //如果 props() 内存在该值，则返回
      return props[key]
    }

    //是否传入的是特定的参数名，是的话返回对应的值
    const publicGetter = publicPropertiesMap[key]
    if(publicGetter) {
      return publicGetter(instance)
    }
  }
}