const {json, merge, getIn, flatten} = require('lib/util')
const {elapsed} = require('lib/date_util')
const assert = require('assert')
const {SILENT_LOGGER} = require('lib/logger')
const diff = require('lib/diff')
const {sortCallbacks} = require('lib/model_callbacks_helper')

function callbacks (model, when, action) {
  const keys = ['update', 'create'].includes(action) ? [action].concat(['save']) : [action]
  const callbacksList = flatten(keys.map(key => getIn(model, ['callbacks', key, when])))
  return sortCallbacks(callbacksList)
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
    const startTime = new Date()
    for (let callback of callbacks(model, when, action)) {
      const operation = (d) => `${model.coll}.${action} ${callback.name} ${when} id=${getIn(d, 'id')}`
      if (!skipCallbacks.includes(callback.name)) {
        if (shouldLog(action)) logger.verbose(`model_callbacks starting ${operation(result)}`)
        try {
          let returnValue = await callback(result, callbackOptions)
          if (shouldLog(action)) logger.verbose(`model_callbacks finished ${operation(result)} elapsed=${elapsed(startTime)}, return value diff:`, (returnValue && diff(result, returnValue)))
          if (returnValue) result = returnValue
        } catch (error) {
          logger.error(`model_callbacks error ${operation(result)} elapsed=${elapsed(startTime)} doc=${json(doc)}`, error)
          throw error
        }
      } else {
        if (shouldLog(action)) logger.verbose(`model_callbacks skipping ${operation(result)}`)
      }
    }
    return result
  }

  return invokeCallbacks
}

module.exports = modelCallbacks
