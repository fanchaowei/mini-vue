import { NodeTypes } from './ast'

export function isText(node) {
  // 判断是否符合复合类型
  return node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION
}
