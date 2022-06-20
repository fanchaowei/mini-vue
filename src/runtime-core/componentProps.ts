//处理props
export function initProps(instance, rawProps) {
  //对父级传入的props进行挂载，如果未传入props，则挂载一个空对象
  instance.props = rawProps || {}
}
