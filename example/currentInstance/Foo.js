import { h, getCurrentInstance } from '../../lib/guide-mini-vue.esm.js'

export const Foo = {
  name: 'Foo',
  render() {
    return h('div', {}, 'Foo')
  },
  setup() {
    const instance = getCurrentInstance()
    console.log('Foo:', instance)
  },
}
