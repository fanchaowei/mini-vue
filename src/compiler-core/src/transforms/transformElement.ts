import { createVNodeCall, NodeTypes } from '../ast'
import { CREATE_ELEMENT_BLOCK } from '../runtimeHelpers'

// element 的情况下，添加引用
export function transformElement(node, context) {
  if (node.type === NodeTypes.ELEMENT) {
    // return 一个函数是因为需要此插件倒序的时候执行
    return () => {
      context.helper(CREATE_ELEMENT_BLOCK)

      // tag
      const vnodeTag = `'${node.tag}'`

      // props
      let vnodeProps

      // children
      const children = node.children
      const vnodeChildren = children[0]

      // 如果是 element 类型则生成特殊的对象
      node.codegenNode = createVNodeCall(vnodeTag, vnodeProps, vnodeChildren)
    }
  }
}