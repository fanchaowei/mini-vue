export function transform(root, options = {}) {
  // 创建一个公用对象
  const context = createTranseformContext(root, options)
  // 处理对象
  traverseNode(root, context)

  // 新增一个其本身的属性，便于后续操作。
  createRootCodegen(root)
}

function createRootCodegen(root: any) {
  root.codegenNode = root.children[0]
}

// 生成一个全局对象，供后续操作
function createTranseformContext(root: any, options: any) {
  const context = {
    root,
    nodeTransforms: options.nodeTransforms || [],
  }
  return context
}

// 处理对象
function traverseNode(node: any, context: any) {
  // 获取传入的处理函数
  const nodeTransforms = context.nodeTransforms
  // 循环调用并执行该处理函数
  for (let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i]
    transform(node)
  }

  // 如果该对象存在 children 则递归执行。
  const children = node.children
  traverseChildren(children, context)

  function traverseChildren(children, context) {
    if (children) {
      for (let i = 0; i < children.length; i++) {
        const node = children[i]
        traverseNode(node, context)
      }
    }
  }
}
