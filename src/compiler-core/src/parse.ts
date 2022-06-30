import { NodeTypes } from './ast'

// 处理 template
export function baseParse(content: string) {
  // 将字符串嵌套在对象中
  const context = createParserContent(content)

  return createRoot(parseChildren(context))
}

// 对字符串进行处理
function parseChildren(context): any {
  const nodes: any = []

  let node
  // 如果是 {{}} 则进入
  if (context.source.startsWith('{{')) {
    node = parseInterpolation(context)
  }

  nodes.push(node)

  return nodes
}

//#region 处理 {{}}

// 处理 {{}} 形式
function parseInterpolation(context) {
  const openDelimiter = '{{'
  const closeDelimiter = '}}'

  // 获取 '}}' 所在位置
  const closeIndex = context.source.indexOf(closeDelimiter)
  // 剪切字符串
  adviceBy(context, openDelimiter.length)

  // 获取到 {{}} 内的字符串长度
  const rawContentLength = closeIndex - openDelimiter.length

  // 获取 {{}} 内的字符串并移除空格
  const rawContent = context.source.slice(0, rawContentLength)
  const content = rawContent.trim()

  // 在处理完上述之后，将这段 {{}} 字符串全部消除，因为还要处理后段字符串要处理。
  adviceBy(context, closeIndex + closeDelimiter.length)

  // 返回特定的格式
  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: content,
    },
  }
}

// 剪切字符串
function adviceBy(context, length) {
  context.source = context.source.slice(length)
}

// 外包裹一个对象
function createRoot(children) {
  return {
    children,
  }
}

// 将字符串嵌套在对象中
function createParserContent(content: string) {
  return {
    source: content,
  }
}

//#endregion
