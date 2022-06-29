import {
  h,
  ref,
  nextTick,
  getCurrentInstance,
} from '../../lib/guide-mini-vue.esm.js'

export default {
  name: 'App',
  setup() {
    const count = ref(1)
    const instance = getCurrentInstance()

    async function onClick() {
      for (let i = 0; i < 100; i++) {
        console.log('update')
        count.value = i
      }

      // 用法一
      // await nextTick()
      // console.log('instance', instance)

      // 用法二
      nextTick(() => {
        console.log('instance', instance)
      })
    }

    return {
      count,
      onClick,
    }
  },
  render() {
    const button = h('button', { onClick: this.onClick }, 'update')
    const p = h('p', {}, 'count:' + this.count)

    return h('div', {}, [button, p])
  },
}
