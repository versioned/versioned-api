const {json, merge, getIn, compact, flatten} = require('lib/util')
const assert = require('assert')
const {SILENT_LOGGER} = require('lib/logger')
const diff = require('lib/diff')

function callbacks (model, when, action) {
  const keys = ['update', 'create'].includes(action) ? [action].concat(['save']) : [action]
  return compact(flatten(keys.map(key => getIn(model, ['callbacks', key, when])))) || []
}

function validAction (action) {
  return ['list', 'get', 'create', 'update', 'delete', 'routeCreate'].includes(action)
}

function validWhen (action, when) {
  if (action === 'create' || action === 'update') {
    return ['beforeValidation', 'afterValidation', 'afterSave'].includes(when)
  } else if (action === 'routeCreate') {
    return ['after'].includes(when)
  } else {
    return ['before', 'after'].includes(when)
  }
}

function shouldLog (when) {
  // NOTE: logging routeCreate gets too verbose
  return when !== 'routeCreate'
}

function modelCallbacks (logger = SILENT_LOGGER) {
  async function invokeCallbacks (api, doc, when, action, options = {}) {
    const {model} = api
    assert(validAction(action), `action=${action} is not valid`)
    assert(validWhen(action, when), `when=${when} is not valid for action=${action}`)
    const callbackOptions = merge(options, {when, action, api, model})
    const skipCallbacks = options.skipCallbacks || []

    let result = doc
    for (let callback of callbacks(model, when, action)) {
      const operation = `${model.coll}.${action} ${callback.name} ${when} id=${getIn(doc, 'id')}`
      if (!skipCallbacks.includes(callback.name)) {
        if (shouldLog(action)) logger.verbose(`model_callbacks starting ${operation}`)
        try {
          let returnValue = await callback(result, callbackOptions)
          if (shouldLog(action)) logger.verbose(`model_callbacks finished ${operation} with return value diff:`, (returnValue && diff(result, returnValue)))
          if (returnValue) result = returnValue
        } catch (error) {
          logger.error(`model_callbacks error ${operation} doc=${json(doc)}`, error)
          throw error
        }
      } else {
        if (shouldLog(action)) logger.verbose(`model_callbacks skipping ${operation}`)
      }
    }
    return result
  }

  return invokeCallbacks
}

module.exports = modelCallbacks
