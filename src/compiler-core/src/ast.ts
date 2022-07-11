import { CREATE_ELEMENT_BLOCK } from './runtimeHelpers'

export const enum NodeTypes {
  INTERPOLATION, // 插值类型
  SIMPLE_EXPRESSION, // 插值内的内容
  ELEMENT,
  TEXT,
  ROOT,
  COMPOUND_EXPRESSION, // 混合类型
}

// transformElement 中 element 类型最后的输出对象
export function createVNodeCall(context, tag, props, children) {
  context.helper(CREATE_ELEMENT_BLOCK)
  return {
    type: NodeTypes.ELEMENT,
    tag,
    props,
    children,
  }
}
