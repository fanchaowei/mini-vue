import { mutableHandlers, readonlyHandlers } from './baseHandlers'
import { track, trigger } from './effect'

//实现reactive
export function reactive(raw) {
  /**
   * Proxy: Proxy对象用于创建对象的一个代理，从而实现基础操作的拦截和自定义
   * 使用：const p = new proxy(target, handler)
   * target: 要包装的目标对象（可以是任何类型的对象，包括原生数组，函数，甚至另一个代理）
   * handler: 一个通常以函数作为属性的对象，各属性中的函数分别定义了在执行各种操作时代理 p 的行为。
   */
  return new Proxy(raw, mutableHandlers)
}

export function readonly(raw) {
  return new Proxy(raw, readonlyHandlers)
}
