const {merge, getIn, compact, flatten} = require('lib/util')
const assert = require('assert')
const {SILENT_LOGGER} = require('lib/logger')

function callbacks (model, when, action) {
  const keys = action === 'delete' ? [action] : [action].concat(['save'])
  return compact(flatten(keys.map(key => getIn(model, ['callbacks', key, when])))) || []
}

function validAction (action) {
  return ['create', 'update', 'delete'].includes(action)
}

function validWhen (action, when) {
  if (action === 'delete') {
    return ['before_delete', 'after_delete'].includes(when)
  } else {
    return ['before_validation', 'after_validation', 'after_save'].includes(when)
  }
}

function modelCallbacks (logger = SILENT_LOGGER) {
  async function invokeCallbacks (model, doc, when, action, options = {}) {
    assert(validAction(action), action)
    assert(validWhen(action, when), when)
    const callbackOptions = merge(options, {when, action, model})

    let result = doc
    for (let callback of callbacks(model, when, action)) {
      logger.verbose(`model_callbacks about to run ${model.coll} ${callback.name} callback`)
      let returnValue = await callback(result, callbackOptions)
      logger.verbose(`model_callbacks finished ${model.coll} ${callback.name} callback with return value:`, returnValue)
      if (returnValue) result = returnValue
    }
    return result
  }

  return invokeCallbacks
}

module.exports = modelCallbacks
