// 储存 effect.update 的数组
const queue: any[] = []
// 一个标识，由于会走 queueFlush 函数，避免创建多个 Promise 对象。使用该标识进行判断。
let isFlushPending = false

const p = Promise.resolve()

/**
 * 防止触发重复的更新，造成资源浪费
 * 该函数会将所有对页面的渲染更新(effect触发)保存起来，放入异步中。等到同步执行完毕再开始页面的渲染更新。
 * @param job 需要保存执行的 effect.update
 */
export function queueJobs(job) {
  // 排除重复的更新
  if (!queue.includes(job)) {
    queue.push(job)
  }
  queueFlush()
}

// 创建异步执行
function queueFlush() {
  // 标识为 true ，说明本次操作已经创建了一个 Promise ，直接返回。
  if (isFlushPending) return
  isFlushPending = true

  nextTick(() => {
    // 重置标识
    isFlushPending = false
    let job
    // shift() 会删除数组的第一个值，并 return 出去。这里将每个存储的 effect.update 一一取出并执行。
    while ((job = queue.shift())) {
      job && job()
    }
  })
}

// nextTick 本质也是将回调函数丢入到微任务中。
export function nextTick(fn) {
  return fn ? p.then(fn) : p
}
