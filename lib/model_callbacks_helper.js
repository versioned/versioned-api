const {flatten} = require('lib/util')
const assert = require('assert')

const SORT = ['first', 'middle', 'last']
const DEFAULT_SORT = 'middle'

function sortedCallback (sort, callback) {
  assert(SORT.includes(sort), `sort=${sort} is not valid`)
  callback.sort = sort
  return callback
}

function sortCallbacks (callbacks) {
  if (!callbacks) return []
  const lists = SORT.map(s => [])
  for (let callback of callbacks) {
    const sort = SORT.includes(callback.sort) ? callback.sort : DEFAULT_SORT
    const index = SORT.indexOf(sort)
    lists[index].push(callback)
  }
  return flatten(lists)
}

module.exports = {
  sortedCallback,
  sortCallbacks
}
