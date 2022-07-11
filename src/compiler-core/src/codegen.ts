import { isString } from '../../shared'
import { NodeTypes } from './ast'
import {
  CREATE_ELEMENT_BLOCK,
  helperMapName,
  TO_DISPLAY_STRING,
} from './runtimeHelpers'

export function generate(ast) {
  const context = createCodegenContext()
  const { push } = context

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

/**
 * 获取 ast 中要输出的 content
 * @param node codegenNode
 * @param context
 */
function genNode(node: any, context) {
  // 不同的类型做不同的处理
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
      // 处理插值内的内容
      genExpression(node, context)
      break
    case NodeTypes.ELEMENT:
      genElement(node, context)
      break
    case NodeTypes.COMPOUND_EXPRESSION:
      // 处理联合类型
      genCompoundExpression(node, context)
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

// element 类型的输出
function genElement(node: any, context: any) {
  const { push, helper } = context
  const { tag, children, props } = node
  push(`${helper(CREATE_ELEMENT_BLOCK)}(`)
  genNodeList(genNullable([tag, props, children]), context)
  push(`)`)
}

// 将需要输出的数据转化为字符串
function genNodeList(nodes: any, context: any) {
  const { push } = context

  // 循环
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (isString(node)) {
      // 如果是字符串则直接输出
      push(node)
    } else {
      // 不是字符串则进入 genNode 继续处理
      genNode(node, context)
    }

    // 加上逗号
    if (i < nodes.length - 1) {
      push(', ')
    }
  }
}

// 对 tag, props, children 进行处理，如果为 undefiend 或空，则统一返回 null
function genNullable(args: any) {
  return args.map((arg) => arg || 'null')
}

// 处理复合类型
function genCompoundExpression(node: any, context: any) {
  const { push } = context

  const children = node.children
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (isString(child)) {
      // 如果是 string 类型则直接添加
      push(child)
    } else {
      // 否则传入 genNode 继续处理
      genNode(child, context)
    }
  }
}
