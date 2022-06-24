import { createRenderer } from '../runtime-core/renderer'

// 创建 DOM
const createElement = (type) => {
  return document.createElement(type)
}
/**
 * 对 DOM 元素的 attribute、prop 和事件等进行配置
 * @param el 容器
 * @param key
 * @param oldVal 旧的 val
 * @param newVal 新的 val
 */
const patchProp = (el, key, oldVal, newVal) => {
  // 判断是否是特定的事件名称：on + Event(注意事件名首字母大写)
  const isOn = (key) => /^on[A-Z]/.test(key)
  if (isOn(key)) {
    //获取事件名，并添加事件
    const event = key.slice(2).toLowerCase()
    el.addEventListener(event, newVal)
  } else {
    if (newVal === undefined || newVal === null) {
      el.removeAttribute(key)
    } else {
      el.setAttribute(key, newVal)
    }
  }
}
// 添加到主容器
const insert = (child, parent, anthor) => {
  // 将 el 添加到 anthor 之前，倘若为 null ，则默认添加到最后，和 append() 一样。
  // 倘若给定的子节点是当前已存在的节点，则会将这个节点移动到锚点之前
  parent.insertBefore(child, anthor || null)
}
//操作 DOM 删除对应的标签
const remove = (children) => {
  const parent = children.parentNode
  if (parent) {
    parent.removeChild(children)
  }
}
//操作 DOM 为标签添加文本
const setElementhost = (el, text) => {
  el.textContent = text
}

const renderer: any = createRenderer({
  createElement,
  patchProp,
  insert,
  remove,
  setElementhost,
})
//因为将之前的 createApp 变成了闭包，故这边需要重新导出 createApp 函数。
export function createApp(...args) {
  //因为 renderer 的闭包 return 的值里就是之前的 createApp ，直接调用即可。
  return renderer.createApp(...args)
}
//因为 runtime-dom 是 runtime-core 的外层
//所以 runtime-core 在这里导出就好，打包的入口改为导出该 index.ts
export * from '../runtime-core'
