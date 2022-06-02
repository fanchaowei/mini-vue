import { camelize, toHandlerKey } from "../shared"

/**
 * 实现 emit 方法
 * ...args 是将用户输入的 emit 第一个 event 参数后的后续参数全收集起来
 * emit 函数第一位是 event 方法名，后续参数都为方法的输入参数
 */
export function emit(instance, event, ...args) {

  //处理 emit 输入的 event 名称，获得 on+Event
  const handlerName = toHandlerKey(camelize(event))
  const handler = instance.props[handlerName]
  handler && handler(...args)
}