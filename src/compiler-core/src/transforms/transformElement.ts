import { NodeTypes } from '../ast'
import { CREATE_ELEMENT_BLOCK } from '../runtimeHelpers'

// element 的情况下，添加引用
export function transformElement(node, context) {
  if (node.type === NodeTypes.ELEMENT) {
    context.helper(CREATE_ELEMENT_BLOCK)

    // tag
    const vnodeTag = node.tag

    // props
    let vnodeProps

    // children
    const children = node.children
    const vnodeChildren = children[0]

    // 如果是 element 类型则生成特殊的对象
    const vnodeElement = {
      type: NodeTypes.ELEMENT,
      tag: vnodeTag,
      props: vnodeProps,
      children: vnodeChildren,
    }
    node.codegenNode = vnodeElement
  }
}
