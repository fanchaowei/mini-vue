import { hasChange, isObject } from '../shared'
import { isTracking, trackEffect, triggerEffect } from './effect'
import { reactive } from './reactive'

/**
 * ref和reactive的区别：ref进来的多数为单值
 * 如何去拦截值类型的get和set？通过对象去包裹，这里通过RefImpt类去包裹。
 * 这也是为什么值类型需要用ref去包裹，需要 .value 的程序设计
 */
class RefImpt {
  private _value: any
  public dep: Set<any> //因为ref只有一个值：.value ，所以只需要一张depSet地图。
  private _rawValue: any //记录原本的参数，因为传入的可能是对象，会被reactive
  public __v_isRef = true //判断isRef使用
  constructor(value) {
    this._value = convert(value)
    this._rawValue = value
    this.dep = new Set()
  }

  get value() {
    trackRefValue(this)
    return this._value
  }

  set value(newValue) {
    //如果赋值的新参数和旧参数一致，则不修改。
    if (hasChange(this._rawValue, newValue)) {
      this._value = convert(newValue)
      this._rawValue = newValue
      //赋值新参数后，触发依赖
      triggerEffect(this.dep)
    }
  }
}

//判断传入的是否为对象，如果是对象则给对象进行reactive
function convert(value) {
  return isObject(value) ? reactive(value) : value
}

function trackRefValue(ref) {
  //如果有effect，存在ReactiveEffect实例，才执行依赖收集，否则直接返回值
  if (isTracking()) {
    trackEffect(ref.dep)
  }
}

export function ref(value) {
  return new RefImpt(value)
}

export function isRef(ref) {
  //如果是一个ref对象，则存在该参数
  return !!ref.__v_isRef
}

export function unRef(ref) {
  return isRef(ref) ? ref.value : ref
}

//当我们把ref对象在 template 内使用时，不需要再 .value ,proxyRef 就是做了这样的工作
export function proxyRefs(objectWithRefs) {
  return new Proxy(objectWithRefs, {
    get(target, key) {
      return unRef(Reflect.get(target, key))
    },

    set(target, key, value) {
      //如果该属性值是ref对象并且set的值不是，则只替换掉 .value 的值
      if (isRef(target[key]) && !isRef(value)) {
        return (target[key].value = value)
      } else {
        // 其他情况一律直接替换
        return Reflect.set(target, key, value)
      }
    },
  })
}
