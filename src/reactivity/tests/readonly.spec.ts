import { isReadonly, readonly } from '../reactive'

// readonly 可读
describe('readonly', () => {
  it('happy path', () => {
    const original = { foo: 1, bar: { baz: 2 } }
    const wrapped = readonly(original)
    expect(wrapped).not.toBe(original)
    expect(wrapped.foo).toBe(1)

    expect(isReadonly(wrapped)).toBe(true)
  })

  //当对可读数据进行set操作时，提示错误
  it('warn then call set', () => {
    //jest.fn()可以方便我们去断言
    console.warn = jest.fn()

    const user = readonly({ age: 10 })
    user.age = 11

    expect(console.warn).toBeCalled()

  })

  it('nested readonly', () => {
    const original = {
      nested: {
        foo: 1
      },
      array: [{ bar: 2 }]
    }

    const observed = readonly(original)
    expect(isReadonly(observed)).toBe(true)
    expect(isReadonly(observed.nested)).toBe(true)
    expect(isReadonly(observed.array)).toBe(true)
    expect(isReadonly(observed.array[0])).toBe(true)
  })
})
