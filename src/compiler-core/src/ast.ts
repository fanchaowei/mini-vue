export const enum NodeTypes {
  INTERPOLATION, // 插值类型
  SIMPLE_EXPRESSION, // 插值内的内容
  ELEMENT,
  TEXT,
  ROOT,
  COMPOUND_EXPRESSION, // 混合类型
}

//transformElement 中 element 类型最后的输出对象
export function createVNodeCall(tag, props, children) {
  return {
    type: NodeTypes.ELEMENT,
    tag,
    props,
    children,
  }
}
