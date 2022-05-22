import { extend } from '../shared'

class ReactiveEffect {
  private _fn: any
  public scheduler: Function | undefined
  public deps = [] //记录所有的依赖，供stop使用
  public active = true //用于判断是否调用stop清空数据

  constructor(fn, scheduler?: Function) {
    this._fn = fn
    this.scheduler = scheduler
  }
  //调用传入的fn
  run() {
    activeEffect = this
    return this._fn()
  }

  stop() {
    if (this.active) {
      cleanupEffect(this)
      if (this.onStop) this.onStop()
      this.active = false
    }
  }
  public onStop?: () => void
}

function cleanupEffect(effect) {
  effect.deps.forEach((dep: any) => {
    dep.delete(effect)
  })
}

//对象地图，是总的依赖对象
let targetMap = new Map()
/**
 * 实现依赖收集
 * 每个对象的每个key都需要有一个依赖收集的容器(dep)
 * 容器的对应关系如下：target地图(targetMap) -> key地图(depMap) -> depSet
 * @param target 对象
 * @param key 键名
 */
export function track(target, key) {
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

  if (!activeEffect) return
  //传入
  dep.add(activeEffect)
  activeEffect.deps.push(dep)
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

//获取ReactiveEffect实例对象
let activeEffect

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
  runner.effect.stop()
}
