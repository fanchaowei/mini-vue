import { isReactive, reactive } from '../reactive'

//测试reactive
describe('reactive', () => {
  it('happy path', () => {
    const original = { foo: 1 }
    const observed = reactive(original)
    //测试这两个对象不相等
    expect(observed).not.toBe(original)
    //测试响应式对象的foo值是1
    expect(observed.foo).toBe(1)

    expect(isReactive(observed)).toBe(true)
    expect(isReactive(original)).toBe(false)
  })
})
