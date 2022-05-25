import { isObject, extend } from '../shared'
import { track, trigger } from './effect'
import { reactive, ReactiveFlags, readonly } from './reactive'

const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)

function createGetter(isReadonly = false, isShallow = false) {
  return function get(target, key) {
    //判断isReactive和isReadonly使用，当key为特定值时，返回响应布尔值
    if(key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if(key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    }
    
    /**
     * Reflect.get(target, key)
     * target: 对象
     * key: 键名
     * 获取对象上某个属性的值。类似target[key]
     */
    const res = Reflect.get(target, key)

    //如何是shallow，就直接返回属性值。
    if(isShallow) return res
    
    //进行多层判断
    if(isObject(res)) {
      //如果取的是响应式的属性值是对象的话，则再给这个对象加上响应式。
      return isReadonly? readonly(res): reactive(res)
    }

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
    console.warn('readonly, 无法进行set', target)
    return true
  },
}

export const shallowReadyonlyHandlers = extend({}, readonlyHandlers, { get: shallowReadonlyGet })
