//特定的参数
const publicPropertiesMap = {
  $el: (i) => i.vnode.el,
  $slots: (i) => i.slots,
  $props: (i) => i.props,
}

//代理，为能通过 this 直接调用到 setup 和 props 的值或输入特定的参数返回对应的数据使用
export const publicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    const { setupState, props } = instance

    const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key)
    if (hasOwn(setupState, key)) {
      //如果 setup() 内存在该值，则返回
      return setupState[key]
    } else if (hasOwn(props, key)) {
      //如果 props() 内存在该值，则返回
      return props[key]
    }

    //是否传入的是特定的参数名，是的话返回对应的值
    const publicGetter = publicPropertiesMap[key]
    if (publicGetter) {
      return publicGetter(instance)
    }
  },
}
