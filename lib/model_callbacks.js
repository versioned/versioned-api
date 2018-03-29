const {getIn, compact, flatten} = require('lib/util')
const assert = require('assert')

function callbacks (model, when, action) {
  const keys = action === 'delete' ? [action] : [action].concat(['save'])
  return compact(flatten(keys.map(key => getIn(model, ['callbacks', key, when])))) || []
}

function validWhen (when) {
  return ['before', 'after'].includes(when)
}

function validAction (action) {
  return ['create', 'update', 'delete'].includes(action)
}

async function invokeCallbacks (model, doc, when, action) {
  assert(validWhen(when))
  assert(validAction(action))
  let result = doc
  for (let callback of callbacks(model, when, action)) {
    let returnValue = await callback(doc)
    if (returnValue) result = returnValue
  }
  return result
}

module.exports = invokeCallbacks
