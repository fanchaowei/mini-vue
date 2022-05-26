import { computed } from "../computed";
import { reactive } from "../reactive";

describe('computed', () => {
  it('happy path', () => {
    const user = reactive({
      age: 1
    })
    const age = computed(() => {
      return user.age
    })
    expect(age.value).toBe(1)
  })

  it('should compute lazy', () => {
    const value = reactive({
      foo: 1
    })
    const getter = jest.fn(() => {
      return value.foo
    })
    const cValue = computed(getter)

    //懒加载
    expect(getter).not.toHaveBeenCalled()
    //当调用时才会记录调用的值
    expect(cValue.value).toBe(1)
    expect(getter).toHaveBeenCalledTimes(1)
    //之后再次get值时，不会再调用 getter 函数
    cValue.value
    expect(getter).toHaveBeenCalledTimes(1)
    //computed 内的 reactive 对象的值改变时，因为懒加载，并不会执行getter去同步数值
    value.foo = 2
    expect(getter).toHaveBeenCalledTimes(1)
    //当去获取 computed 的值时，才调用 getter 去同步更新数值
    cValue.value
    expect(getter).toHaveBeenCalledTimes(2)

  })
});