//mini-vue 入口
export * from './runtime-dom'
export * from './reactivity'

import { baseCompile } from './compiler-core/src'
import * as runtimeDom from './runtime-dom'
import { registerRuntimeCompiler } from './runtime-dom'

// 通过 template 获取 render
function compileToFunction(template) {
  const { code } = baseCompile(template)
  /**
   * new Function 为新建函数。第一个参数是新建的函数的参数、第二个参数是 functionBody
   * 此处为新建函数之后调用该函数，返回 render
   */
  const render = new Function('Vue', code)(runtimeDom)
  return render
}

// 将 compileToFunction 函数传入 component
registerRuntimeCompiler(compileToFunction)
