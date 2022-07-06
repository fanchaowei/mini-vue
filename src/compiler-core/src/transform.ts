import { NodeTypes } from './ast'

/**
 *
 * @param root baseParse 处理后的 ast
 * @param options 需要动态处理的配置对象
 */
export function transform(root, options = {}) {
  // 创建一个公用对象
  const context = createTranseformContext(root, options)
  // 处理对象
  traverseNode(root, context)

  // 新增一个其本身的属性，便于后续操作。
  createRootCodegen(root)

  // 将处理之后全局对象上的 helpers 的 key 转为数组存入 ast 中，为之后操作提供。
  root.helpers = [...context.helpers.keys()]
}

function createRootCodegen(root: any) {
  root.codegenNode = root.children[0]
}
// 生成一个全局对象，供后续操作
function createTranseformContext(root: any, options: any) {
  const context = {
    root,
    nodeTransforms: options.nodeTransforms || [],
    helpers: new Map(),
    helper: (key) => {
      context.helpers.set(key, 1)
    },
  }
  return context
}

/**
 *
 * @param node baseParse 处理后的 ast
 * @param context 全局对象
 */
function traverseNode(node: any, context: any) {
  // 获取传入的处理函数
  const nodeTransforms = context.nodeTransforms
  // 循环调用并执行该处理函数
  for (let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i]
    transform(node)
  }

  // 根据当前处理的对象的类型，进行不同的处理
  switch (node.type) {
    case NodeTypes.INTERPOLATION:
      // 是插值时，调用 helper 存入需要的字符串
      context.helper('toDisplayString')
      break

    default:
      break
  }

  // 如果该对象存在 children 则递归执行。
  traverseChildren(node, context)
}

function traverseChildren(node, context) {
  const children = node.children
  if (children) {
    for (let i = 0; i < children.length; i++) {
      const node = children[i]
      traverseNode(node, context)
    }
  }
}
