import { h } from '../../lib/guide-mini-vue.esm.js'
import { Foo } from './Foo.js'

export const App = {
  name: 'App',
  render() {
    const el = h('div', {}, 'el')
    const foo = h(
      Foo,
      {},
      {
        header: ({ age }) => h('p', {}, '123 ' + age),
        footer: () => h('p', {}, '234'),
      }
    )
    return h('div', {}, [el, foo])
  },
  setup() {},
}
