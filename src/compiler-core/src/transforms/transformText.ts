import { NodeTypes } from '../ast'
import { isText } from '../utils'

export function transformText(node) {
  const { children } = node

  // 只有本身是 element 才执行
  if (node.type === NodeTypes.ELEMENT) {
    // 需要倒序执行，return 一个函数
    return () => {
      // 存放输出结果的容器
      let currentContainer
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        // 判断是否是复合类型
        if (isText(child)) {
          // 如果是以它为起点，开始向后查找和其相连的符合条件的 children
          for (let j = i + 1; j < children.length; j++) {
            const next = children[j]
            if (isText(next)) {
              // 初始化
              if (!currentContainer) {
                currentContainer = children[i] = {
                  type: NodeTypes.COMPOUND_EXPRESSION,
                  children: [child],
                }
              }
              currentContainer.children.push(' + ')
              currentContainer.children.push(next)

              // 添加完后，删除原数组中对应的 children。
              children.splice(j, 1)
              j--
            } else {
              // 如果不负责，则重置容器退出循环
              currentContainer = undefined
              break
            }
          }
        }
      }
    }
  }
}
