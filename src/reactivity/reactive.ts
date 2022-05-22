import { track, trigger } from './effect'

//实现reactive
export function reactive(raw) {
  /**
   * Proxy: Proxy对象用于创建对象的一个代理，从而实现基础操作的拦截和自定义
   * 使用：const p = new proxy(target, handler)
   * target: 要包装的目标对象（可以是任何类型的对象，包括原生数组，函数，甚至另一个代理）
   * handler: 一个通常以函数作为属性的对象，各属性中的函数分别定义了在执行各种操作时代理 p 的行为。
   */
  return new Proxy(raw, {
    get(target, key) {
      /**
       * Reflect.get(target, key)
       * target: 对象
       * key: 键名
       * 获取对象上某个属性的值。类似target[key]
       */
      const res = Reflect.get(target, key)

      // TODO 依赖收集
      track(target, key)
      return res
    },

    set(target, key, value) {
      /**
       * Reflect.set(target, key, value)
       * target: 对象
       * key: 键名
       * value: 值
       * 为对象设置属性，返回一个boolean，更新成功则返回true
       */
      const res = Reflect.set(target, key, value)
      // TODO 触发依赖
      trigger(target, key)
      return res
    },
  })
}
