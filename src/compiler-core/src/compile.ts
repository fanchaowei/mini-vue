import { generate } from './codegen'
import { baseParse } from './parse'
import { transform } from './transform'
import { transformElement } from './transforms/transformElement'
import { transformExpression } from './transforms/transformExpression'
import { transformText } from './transforms/transformText'

// 提供给入口调用的 template 转 code 字符串的函数
export function baseCompile(template) {
  const ast = baseParse(template)

  transform(ast, {
    nodeTransforms: [transformExpression, transformElement, transformText],
  })

  return generate(ast)
}
