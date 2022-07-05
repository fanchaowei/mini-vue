// /abc/.test('abc')

function test(string) {
  let i = 0
  let startIndex = 0
  let endIndex = 0
  let arr = []

  function waitForA(word) {
    if (word === 'a') {
      startIndex = i
      return waitForB
    }
    return waitForA
  }

  function waitForB(word) {
    if (word === 'b') {
      return waitForC
    }
    return waitForA
  }

  function waitForC(word) {
    if (word === 'c') {
      endIndex = i
      return end
    }
    return waitForA
  }

  function end() {
    return end
  }

  let currentState = waitForA

  for (i = 0; i < string.length; i++) {
    let nextState = currentState(string[i])
    currentState = nextState

    if (currentState === end) {
      // return true
      // return [startIndex, endIndex]
      arr.push({
        startIndex,
        endIndex,
      })
      currentState = waitForA
    }
  }

  if (arr.length > 0) {
    return arr
  }

  return false
}

console.log(test('rrvabcabc'))
