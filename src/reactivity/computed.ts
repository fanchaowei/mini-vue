import { ReactiveEffect } from "./effect"

class ComputedRefImpl {
  private _getter: any // computed 函数
  private _dirty: boolean = true // 判断是否需要执行 getter 去同步更新数值
  private _value: any // 缓存的值结果
  private _effect: any // getter 的 ReactiveEffect 实例

  constructor(getter) {
    this._getter = getter

    //为computed内的函数绑定effect，为内部的reactive对象创建effect实例
    this._effect = new ReactiveEffect(getter, () => {
      /**
       * 该 scheduler 的目的时为了懒加载
       * 该 scheduler 只将 _dirty 变为 true
       * 并不进行对 computed 函数输出的 .value 值进行修改
       * 这样的话，就只在后续 get computed 函数的 .value 值时，通过 get value() 时进行赋值
       */
      if(!this._dirty) {
        this._dirty = true
      }
    })
  }

  get value() {
    if(this._dirty) {
      //执行run() 相当于执行了 getter()
      this._value = this._effect.run()
      this._dirty = false
    }
    return this._value
  }

}

export function computed(getter) {
  return new ComputedRefImpl(getter)
}