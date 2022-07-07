import { NodeTypes } from './ast'
import { helperMapName, TO_DISPLAY_STRING } from './runtimeHelpers'

export function generate(ast) {
  const context = createCodegenContext()
  const { push } = context

  console.log('@@@', ast)

  // 拼接的数据整理
  const functionName = 'render'
  const args = ['_ctx', '_cache']
  const signature = args.join(',')

  // 处理导入的片段
  genFunctionPreamble(ast, context)

  // 文本拼接
  push(`function ${functionName}(${signature}) {`)
  push(`return `)
  genNode(ast.codegenNode, context)
  push(`}`)

  return {
    code: context.code,
  }
}

// 处理导入的片段
function genFunctionPreamble(ast: any, context) {
  const { push } = context

  const VueBinging = 'Vue'
  const helpers = ast.helpers
  const aliasHeplers = (s) => `${helperMapName[s]}: _${helperMapName[s]}`
  // 当 helpers 大于0时，才说明存在需要导入的值。
  if (helpers.length > 0) {
    push(`const { ${helpers.map(aliasHeplers).join(',')} } = ${VueBinging}`)
    push('\n')
  }
  push('return ')
}

// 获取 ast 中要输出的 content
function genNode(node: any, context) {
  switch (node.type) {
    case NodeTypes.TEXT:
      // 处理 text
      genText(node, context)
      break
    case NodeTypes.INTERPOLATION:
      // 处理插值
      genInterpolation(node, context)
      break
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context)
      break
    default:
      break
  }
}

// 将拼接的文本已经执行拼接的函数封装成一个对象，利于后续使用。
function createCodegenContext() {
  const context = {
    code: '',
    push: (source) => {
      context.code += source
    },
    helper: (key) => {
      return `_${helperMapName[key]}`
    },
  }
  return context
}

function genText(node, context) {
  const { push } = context
  push(`'${node.content}'`)
}

function genInterpolation(node: any, context: any) {
  const { push, helper } = context
  push(`${helper(TO_DISPLAY_STRING)}(`)
  // 如果是插值类型，插值类型的值其实在 content 内，类型为 SIMPLE_EXPRESSION 。所以重新将 content 送入进行处理导出
  genNode(node.content, context)
  push(`)`)
}
function genExpression(node: any, context: any) {
  const { push } = context
  push(`${node.content}`)
}
