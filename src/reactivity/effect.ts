import { extend } from '../shared'

//获取ReactiveEffect实例对象
let activeEffect
//判断是否需要进行依赖收集
let shouldTrack = false

export class ReactiveEffect {
  private _fn: any
  public scheduler: Function | undefined
  public deps = [] //此次effect所涉及的对象属性的属性地图
  /**
   * 用于判断使用stop()时是否需要清空数据，true为需要。
   * *也是作为是否调用了stop()的标识，值为false时，则肯定是调用了stop
   */
  public active = true

  constructor(fn, scheduler?: Function) {
    this._fn = fn
    this.scheduler = scheduler
  }
  //调用传入的fn
  run() {
    activeEffect = this

    /**
     * 因为在run()内调用this._fn()，会触发reactive的get，而get内会进行依赖收集
     * 故在此处做stop后禁止依赖收集的控制
     */

    //当active为false时，说明已经调用了stop()，因为shouldTrack为false，直接返回不触发依赖收集
    if (!this.active) {
      return this._fn()
    }

    //当active为true，将shouldTrack变为true，允许依赖收集
    shouldTrack = true
    const result = this._fn()
    shouldTrack = false

    return result
  }

  stop() {
    //active起到标识作用，第一次执行后则变为false，避免重复执行浪费资源
    if (this.active) {
      //清空依赖
      cleanupEffect(this)
      //如果存在onStop，则执行
      if (this.onStop) this.onStop()
      this.active = false
    }
  }
  public onStop?: () => void
}

function cleanupEffect(effect) {
  // 遍历并清空每个依赖
  effect.deps.forEach((dep: any) => {
    dep.delete(effect)
  })
  effect.deps.length = 0
}

//对象地图，是总的依赖对象
let targetMap = new Map()
/**
 * 实现依赖收集
 * 每个对象的每个key都需要有一个依赖收集的容器(dep)
 * 容器的对应关系如下：总对象地图(targetMap) -> 对象地图(depsMap) -> 属性地图(depSet)
 * @param target 对象
 * @param key 键名
 */
export function track(target, key) {
  if (!isTracking()) return

  //通过对象地图获取key地图
  let depsMap = targetMap.get(target)
  //如果对象地图中不存在key地图，则新增一个空的key地图存入
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }

  //获取容器
  let dep = depsMap.get(key)
  // 如果没有则新增一个空Set，并存入
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }

  trackEffect(dep)
}

export function trackEffect(dep) {
  if (dep.has(activeEffect)) return
  //将ReactiveEffect实例传入dep中
  dep.add(activeEffect)
  //在实例内保存了此次effect所涉及的对象属性的属性地图
  activeEffect.deps.push(dep)
}

// 用于判断是否可以tracking
export function isTracking() {
  // 当不存在activeEffect实例对象，也就是数据只reactive但没有effect时，返回，不去收集依赖
  // if (!activeEffect) return
  // 当使用stop的情况后，shouldTrack变为false，不去收集依赖
  // if(!shouldTrack) return

  // *如下代码是对如上代码的合并
  return shouldTrack && activeEffect !== undefined
}

/**
 * 实现触发依赖
 * 基于target和key，取出dep对象，去遍历并调用所有的收集的fn
 * @param target 对象
 * @param key 键名
 */
export function trigger(target, key) {
  const depsMap = targetMap.get(target)
  const dep = depsMap.get(key)

  triggerEffect(dep)
}

export function triggerEffect(dep) {
  //执行fn
  for (const effect of dep) {
    //当发生更新时，如果存在 scheduler 则触发 scheduler
    if (effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run()
    }
  }
}

export function effect(fn, options: any = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler)
  extend(_effect, options) //extend为Object.assign的封装

  _effect.run()

  //bind()能将函数内的this指针指向bind()内的参数
  const runner: any = _effect.run.bind(_effect)
  runner.effect = _effect

  return runner
}

export function stop(runner) {
  //调用实例上的stop()方法
  runner.effect.stop()
}
