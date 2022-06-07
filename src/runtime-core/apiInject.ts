import { getCurrentInstance } from './component'

export function provider(key, value) {
  const currentInstance: any = getCurrentInstance()

  if (currentInstance) {
    let { provides } = currentInstance
    const parentProvides = currentInstance.parent.provides
    if (provides === parentProvides) {
      provides = currentInstance.provides = Object.create(parentProvides)
    }
    provides[key] = value
  }
}

export function inject(key) {
  const currentInstance: any = getCurrentInstance()
  const { provides } = currentInstance.parent

  return provides[key]
}
