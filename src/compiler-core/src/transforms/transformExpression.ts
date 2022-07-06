import { NodeTypes } from '../ast'

// 处理插值的输出。
export function transformExpression(node) {
  if (node.type === NodeTypes.INTERPOLATION) {
    const rawContent = node.content.content
    node.content.content = '_ctx.' + rawContent
  }
}
