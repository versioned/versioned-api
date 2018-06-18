const {empty} = require('lib/util')
const assert = require('assert')

const SORT = ['first', 'middle', 'last']
const DEFAULT_SORT = 'middle'

function getSort (callback) {
  return SORT.indexOf(callback.sort || DEFAULT_SORT)
}

function sortedCallback (sort, callback) {
  assert(SORT.includes(sort), `sort=${sort} is not valid`)
  callback.sort = sort
  return callback
}

function sortCallbacks (callbacks) {
  if (empty(callbacks)) return []
  const copy = callbacks.concat()
  return copy.sort((c1, c2) => {
    const s1 = getSort(c1)
    const s2 = getSort(c2)
    if (s1 === s2) {
      return 0
    } else {
      return s1 < s2 ? -1 : 1
    }
  })
}

module.exports = {
  sortedCallback,
  sortCallbacks
}
