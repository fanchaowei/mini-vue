import { effect, stop } from '../effect'
import { reactive } from '../reactive'

//测试effect
describe('effect', () => {
  it('happy path', () => {
    const user = reactive({
      age: 10,
      num: 1,
      size: 100
    })

    let nextAge
    let nextNum
    let nextSize
    effect(() => {
      //相当于实际使用中，nextAge与user.age绑定，nextAge的值会根据user.age变化
      nextAge = user.age + 1
      nextSize = user.size + 1
    })
    effect(() => {
      nextNum = user.num + 1
    })

    expect(nextAge).toBe(11)

    //update
    user.age++
    expect(nextAge).toBe(12)
    user.num++
    expect(nextNum).toBe(3)
  })

  /**
   * effect(fn)之后会返回一个新的fn(名为runner)，
   * 调用这个runner就能重新调用effect传入的fn，并把fn计算的值return出去
   */
  it('runner', () => {
    let foo = 10
    const runner = effect(() => {
      foo++
      return 'foo'
    })

    expect(foo).toBe(11)

    const f = runner()
    expect(f).toBe('foo')
    expect(foo).toBe(12)
  })

  /**
   * 1. 通过 effect 的第二个参数给定的一个 scheduler 的 fn
   * 2. effect 第一次执行的时候 还会执行 fn
   * 3. 当响应式对象 set update 时，就不会执行 fn 而是执行 scheduler
   * 4. 如果说当执行 runner 的时候， 会再次执行 fn
   */
  it('scheduler', () => {
    let dummy
    let run: any
    const scheduler = jest.fn(() => {
      run = runner
    })
    const obj = reactive({ foo: 1 })
    const runner = effect(
      () => {
        dummy = obj.foo
      },
      { scheduler }
    )
    expect(scheduler).not.toHaveBeenCalled() //没有被调用
    expect(dummy).toBe(1)
    obj.foo++
    expect(scheduler).toHaveBeenCalledTimes(1) //测试是否被调用一次
    expect(dummy).toBe(1)
    //因为上面对参数进行了update，触发了scheduler内的函数，run则是runner
    run()
    expect(dummy).toBe(2)
  })

  //调用stop之后，响应式就会失效
  it('stop', () => {
    let dummy
    const obj = reactive({ prop: 1 })
    const runner = effect(() => {
      dummy = obj.prop
    })
    obj.prop = 2
    expect(dummy).toBe(2)
    stop(runner)
    obj.prop = 3
    expect(dummy).toBe(2)
    //相当于obj.prop = obj.prop + 1,调用了一次get，再一次set
    //调用get会触发依赖收集，导致
    obj.prop++  
    expect(dummy).toBe(2)

    runner()
    expect(dummy).toBe(4)
  })

  //在执行stop时，会调用一次onStop，类似于回调函数
  it('onStop', () => {
    const obj = reactive({
      foo: 1,
    })
    const onStop = jest.fn()
    let dummy
    const runner = effect(
      () => {
        dummy = obj.foo
      },
      { onStop }
    )

    stop(runner)
    expect(onStop).toBeCalledTimes(1)
  })
})
