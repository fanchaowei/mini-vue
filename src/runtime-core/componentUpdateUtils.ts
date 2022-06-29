// 判断组件是否需要更新
export function shouldUpdateComponent(prevVNode, nextVNode) {
  const { props: prevProps } = prevVNode
  const { props: nextProps } = nextVNode
  // 循环比较，如果出现不相等的 props ，说明需要更新
  for (const key in nextProps) {
    if (prevProps[key] !== nextProps[key]) {
      return true
    }
  }

  return false
}
