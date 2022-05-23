import { track, trigger } from './effect'

const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)

function createGetter(isReadonly = false) {
  return function get(target, key) {
    /**
     * Reflect.get(target, key)
     * target: 对象
     * key: 键名
     * 获取对象上某个属性的值。类似target[key]
     */
    const res = Reflect.get(target, key)

    if (!isReadonly) {
      // TODO 依赖收集
      track(target, key)
    }
    return res
  }
}

function createSetter() {
  return function set(target, key, value) {
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
  }
}

export const mutableHandlers = {
  get,
  set,
}

export const readonlyHandlers = {
  get: readonlyGet,
  set(target, key, value) {
    return true
  },
}
