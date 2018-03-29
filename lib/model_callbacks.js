const {getIn, compact, flatten} = require('lib/util')
const assert = require('assert')

function callbacks (model, when, action) {
  const keys = action === 'delete' ? [action] : [action].concat(['save'])
  return compact(flatten(keys.map(key => getIn(model, 'callbacks', key, when))))
}

async function invokeCallbacks (model, doc, when, action) {
  assert(['before', 'after'].includes(when))
  assert(['create', 'update', 'delete'].includes(action))
  let result = doc
  for (let callback of callbacks(model, when, action)) {
    let returnValue = await callback(doc)
    if (returnValue) result = returnValue
  }
  return result
}

module.exports = invokeCallbacks
