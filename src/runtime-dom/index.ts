import { createRenderer } from '../runtime-core/renderer'

// 创建 DOM
const createElement = (type) => {
  return document.createElement(type)
}
/**
 * 对 DOM 元素的 attribute、prop 和事件等进行配置
 * @param el 容器
 * @param key
 * @param val
 */
const patchProp = (el, key, val) => {
  // 判断是否是特定的事件名称：on + Event(注意事件名首字母大写)
  const isOn = (key) => /^on[A-Z]/.test(key)
  if (isOn(key)) {
    //获取事件名，并添加事件
    const event = key.slice(2).toLowerCase()
    el.addEventListener(event, val)
  } else {
    el.setAttribute(key, val)
  }
}
// 添加到主容器
const insert = (el, parent) => {
  parent.append(el)
}

const renderer: any = createRenderer({
  createElement,
  patchProp,
  insert,
})
//因为将之前的 createApp 变成了闭包，故这边需要重新导出 createApp 函数。
export function createApp(...args) {
  //因为 renderer 的闭包 return 的值里就是之前的 createApp ，直接调用即可。
  return renderer.createApp(...args)
}
//因为 runtime-dom 是 runtime-core 的外层
//所以 runtime-core 在这里导出就好，打包的入口改为导出该 index.ts
export * from '../runtime-core'
