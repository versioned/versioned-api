const {sortCallbacks, sortedCallback} = require('./model_callbacks_helper')

test('sortCallbacks - sorts callbacks by first/middle/last (defaults to middle)', async () => {
  const cbA = function () {}
  const cbB = function () {}
  const cbC = function () {}

  expect(sortCallbacks(undefined)).toEqual([])
  expect(sortCallbacks([cbA, cbB, cbC])).toEqual([cbA, cbB, cbC])

  sortedCallback('first', cbC)
  expect(sortCallbacks([cbA, cbB, cbC])).toEqual([cbC, cbA, cbB])

  sortedCallback('first', cbB)
  expect(sortCallbacks([cbA, cbB, cbC])).toEqual([cbB, cbC, cbA])

  cbA.sort = 'first'
  expect(sortCallbacks([cbA, cbB, cbC])).toEqual([cbA, cbB, cbC])

  cbC.sort = 'first'
  cbA.sort = 'middle'
  cbB.sort = 'last'
  expect(sortCallbacks([cbA, cbB, cbC])).toEqual([cbC, cbA, cbB])

  cbC.sort = 'last'
  cbA.sort = 'middle'
  cbB.sort = 'last'
  expect(sortCallbacks([cbA, cbB, cbC])).toEqual([cbA, cbB, cbC])

  cbC.sort = 'middle'
  cbA.sort = 'middle'
  cbB.sort = 'first'
  expect(sortCallbacks([cbA, cbB, cbC])).toEqual([cbB, cbA, cbC])
})
