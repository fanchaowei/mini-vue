import { getCurrentInstance } from './component'

export function provider(key, value) {
  //获取组件实例对象
  const currentInstance: any = getCurrentInstance()

  if (currentInstance) {
    let { provides } = currentInstance
    //获取父组件实例对象
    const parentProvides = currentInstance.parent.provides
    /**
     * 这里是初始化用
     * 因为 provides 默认初始值是其父组件的 provides
     * 故如果父子的 provides 相同，说明子组件当前的 provides 还未初始化
     */
    if (provides === parentProvides) {
      /**
       * 此处解构赋值的 provides 其实只是为了之后书写快捷方便使用，故不要被误解，本质看 currentInstance.provides
       * Object.create(proto) 能返回一个新的对象，而参数 proto 绑定到其原型对象上
       * 这样就可以让多级连通，子级可以通过原型链向上访问。
       */
      provides = currentInstance.provides = Object.create(parentProvides)
    }
    provides[key] = value
  }
}

export function inject(key, defaultValue) {
  const currentInstance: any = getCurrentInstance()
  const { provides } = currentInstance.parent

  //如果存在这个 provides 属性则返回返回值，不存在则返回输入的默认值
  if (key in provides) {
    return provides[key]
  } else {
    if (typeof defaultValue === 'function') {
      return defaultValue()
    }
    return defaultValue
  }
}
