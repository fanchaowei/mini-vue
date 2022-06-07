import { h, provider, inject } from '../../lib/guide-mini-vue.esm.js'

export const App = {
  name: 'App',
  setup() {},
  render() {
    return h('div', {}, [h('div', {}, 'App'), h(Provider)])
  },
}

export const Provider = {
  name: 'Provider',
  setup() {
    provider('foo', 'fooVal')
    provider('bar', 'barVal')
  },
  render() {
    return h('div', {}, [h('p', {}, 'Provider'), h(ProviderTwo)])
  },
}

export const ProviderTwo = {
  name: 'Provider',
  setup() {
    provider('foo', 'fooTwo')
    const foo = inject('foo')

    return {
      foo,
    }
  },
  render() {
    return h('div', {}, [
      h('p', {}, `ProviderTwo foo: ${this.foo}`),
      h(Consumer),
    ])
  },
}

const Consumer = {
  name: 'Consumer',
  setup() {
    const foo = inject('foo')
    const bar = inject('bar')

    return {
      foo,
      bar,
    }
  },
  render() {
    return h('div', {}, `Consumer: - ${this.foo} - ${this.bar}`)
  },
}
