import { generate } from '../src/codegen'
import { baseParse } from '../src/parse'
import { transform } from '../src/transform'

describe('codegen', () => {
  it('string', () => {
    const ast = baseParse('hi')

    transform(ast)

    const { code } = generate(ast)

    /**
     * toMatchSnapshot 是代码快照
     * 在该目录下会生成 _snapshots_ 文件夹本生成对应的快照文件
     * 该 api 会通过快照文件的代码和输出的代码对比，是相同还是不同。
     * 如果是我们手动要修改快照代码，则在命令执行时加上 -u 。这样就会将快照代码的结果同步到这次的输出。
     * 例：yarn test codegen -u
     */
    expect(code).toMatchSnapshot()
  })
})
