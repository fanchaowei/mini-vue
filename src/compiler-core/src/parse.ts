import { NodeTypes } from './ast'

const enum TagType {
  START,
  END,
}

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
  const s = context.source
  if (s.startsWith('{{')) {
    // 处理{{}}
    node = parseInterpolation(context)
  } else if (s[0] === '<') {
    if (/[a-z]/i.test(s)) {
      // 处理 element
      node = parseElement(context)
    }
  } else {
    // 处理 text
    node = parseText(context)
  }

  nodes.push(node)

  return nodes
}

function parseTextData(context, length) {
  // 删除并推进
  const content = context.source.slice(0, length)
  adviceBy(context, length)

  return content
}

//#region 处理 text

function parseText(context: any) {
  // text 就直接获取其本身就行
  const content = parseTextData(context, context.source.length)

  return {
    type: NodeTypes.TEXT,
    content,
  }
}

//#endregion

//#region 处理 element

function parseElement(context) {
  // 处理并获取需要 return 的对象
  const element = parseTag(context, TagType.START)

  // 再次处理是为了消除 element 的后半部分，例：</div>
  parseTag(context, TagType.END)

  return element
}

function parseTag(context, type: TagType) {
  /**
   * exec 会返回一个数组
   * 以 <div> 为例，数组第一个参数是：<div 。第二个参数是 div
   */
  const match: any = /^<\/?([a-z]*)/i.exec(context.source)

  // 获取 tag
  const tag = match[1]

  // 将处理完的部分删除
  adviceBy(context, match[0].length)
  adviceBy(context, 1)

  // 倘若传入的是 end ，说明只是为了消除后半部分，已经处理完了，无需 return
  if (tag === TagType.END) return

  return {
    type: NodeTypes.ELEMENT,
    tag: tag,
  }
}

//#endregion

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
  const rawContent = parseTextData(context, rawContentLength)
  const content = rawContent.trim()

  // 在处理完上述之后，将这段 {{}} 字符串全部消除，因为还要处理后段字符串要处理。
  adviceBy(context, closeDelimiter.length)

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
