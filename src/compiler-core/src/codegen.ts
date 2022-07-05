export function generate(ast) {
  const context = createCodegenContext()
  const { push } = context

  // 拼接的数据整理
  const functionName = 'render'
  const args = ['_ctx', '_cache']
  const signature = args.join(',')

  // 文本拼接
  push('return ')
  push(`function ${functionName}(${signature}) {`)
  push(`return `)
  genNode(ast.codegenNode, context)
  push(`}`)

  return {
    code: context.code,
  }
}

// 获取 ast 中要输出的 content
function genNode(node: any, context) {
  const { push } = context
  push(`'${node.content}'`)
}

// 将拼接的文本已经执行拼接的函数封装成一个对象，利于后续使用。
function createCodegenContext() {
  const context = {
    code: '',
    push: (source) => {
      context.code += source
    },
  }
  return context
}
