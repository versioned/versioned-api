const {merge, getIn, compact, flatten} = require('lib/util')
const assert = require('assert')
const {SILENT_LOGGER} = require('lib/logger')

function callbacks (model, when, action) {
  const keys = action === 'delete' ? [action] : [action].concat(['save'])
  return compact(flatten(keys.map(key => getIn(model, ['callbacks', key, when])))) || []
}

function validAction (action) {
  return ['list', 'get', 'create', 'update', 'delete'].includes(action)
}

function validWhen (action, when) {
  if (action === 'create' || action === 'update') {
    return ['beforeValidation', 'afterValidation', 'afterSave'].includes(when)
  } else {
    return ['before', 'after'].includes(when)
  }
}

function modelCallbacks (logger = SILENT_LOGGER) {
  async function invokeCallbacks (model, doc, when, action, options = {}) {
    assert(validAction(action), `action=${action} is not valid`)
    assert(validWhen(action, when), `when=${when} is not valid for action=${action}`)
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
