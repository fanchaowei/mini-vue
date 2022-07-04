import { NodeTypes } from './ast'

const enum TagType {
  START,
  END,
}

// 处理 template
export function baseParse(content: string) {
  // 将字符串嵌套在对象中
  const context = createParserContent(content)

  return createRoot(parseChildren(context, []))
}

// 对字符串进行处理
// ancestors 是存放 tag 的数组，用于 isEnd 函数的判断
function parseChildren(context, ancestors): any {
  const nodes: any = []

  let node

  // 循环处理, 为的是将字符串逐一处理。
  while (!isEnd(context, ancestors)) {
    const s = context.source
    if (s.startsWith('{{')) {
      // 处理{{}}
      node = parseInterpolation(context)
    } else if (s[0] === '<') {
      if (/[a-z]/i.test(s)) {
        // 处理 element
        node = parseElement(context, ancestors)
      }
    } else {
      // 处理 text
      node = parseText(context)
    }

    nodes.push(node)
  }

  return nodes
}

// 是否停止对字符串处理的循环
function isEnd(context, ancestors) {
  const s = context.source
  // 是否是 </***> 结尾
  // if (ancestors && s.startsWith(`</${ancestors}>`)) {
  //   return true
  // }

  for (let i = ancestors.length - 1; i >= 0; i--) {
    // 循环存放 tag 的数组，当当前处理的字符串与数组内的 tag 存在匹配时，返回 true
    const tag = ancestors[i]
    if (startsWithEndTagOpen(s, tag)) {
      return true
    }
  }

  // 字符串是否为空
  return !s
}

function parseTextData(context, length) {
  // 删除并推进
  const content = context.source.slice(0, length)
  adviceBy(context, length)

  return content
}

function startsWithEndTagOpen(source, tag) {
  return source.slice(2, 2 + tag.length) === tag
}

//#region 处理 text

function parseText(context: any) {
  let endIndex = context.source.length
  let endToken = ['{{', '<']

  for (let i = 0; i < endToken.length; i++) {
    // 判断并找出 text 的长度
    const index = context.source.indexOf(endToken[i])
    // 判断所有情况，取最小值(最近的)
    if (index >= 0 && index < endIndex) {
      endIndex = index
    }
  }

  const content = parseTextData(context, endIndex)

  return {
    type: NodeTypes.TEXT,
    content,
  }
}

//#endregion

//#region 处理 element

function parseElement(context, ancestors) {
  // 处理并获取需要 return 的对象
  const element: any = parseTag(context, TagType.START)

  // 将当前处理的 tag 存入数组。用于 isEnd 判断使用
  ancestors.push(element.tag)

  // 对标签内的数据进行解析
  element.children = parseChildren(context, ancestors)

  // 标签内部数据处理完成，删除该标签的判断用标识。
  ancestors.pop()

  // 判断后半段是否和 tag 相同。如果是则是完整标签正常消除。如果不是说明标签存在确实，抛出异常。
  if (startsWithEndTagOpen(context.source, element.tag)) {
    // 再次处理是为了消除 element 的后半部分，例：</div>
    parseTag(context, TagType.END)
    return element
  } else {
    throw `缺少结束标签：${element.tag}`
  }
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
