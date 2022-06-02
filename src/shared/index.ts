export const extend = Object.assign

export const isObject = (val) => {
  return val !== null && typeof val === 'object'
}

export const hasChange = (value, newValue) => {
  return !Object.is(value, newValue)
}

//第一位大写
export const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
//将 aaa-bbb 的格式变为 aaaBbb
export const camelize = (str: string) => {
  // _ 代表的是 - 以及 - 后的第一位，即 -b
  // c 代表的是 - 后的第一位, 即 b
  return str.replace(/-(\w)/g, (_, c:string) => {
    return c? c.toUpperCase() : ''
  })
}
//是否存在，存在则添加上 on
export const toHandlerKey = (str: string) => {
  return str ? 'on' + capitalize(str) : ''
}