const {pick, keys, merge, parseIfInt} = require('lib/util')
const {idType} = require('lib/model_meta')
const {readableData, writableDoc, updatableDoc} = require('lib/model_access')
const {coerce} = require('lib/coerce')
const {promiseAll} = require('lib/promise_helper')

function modelController (modelApi, responseModule, options = {}) {
  const {jsonResponse, errorResponse, wrapData} = responseModule
  const model = modelApi.model

  function readableFilter (body) {
    return merge(body, {data: readableData(model, body.data)})
  }

  function getScope (req) {
    if (options.scope && model.schema.properties[options.scope]) {
      return {[options.scope]: req.pathParams[options.scope]}
    } else {
      return undefined
    }
  }

  function scoped (req, doc) {
    const scope = getScope(req)
    return scope ? merge(doc, scope) : doc
  }

  function apiOptions (req) {
    const scope = getScope(req)
    return merge(pick(req, ['account', 'space', 'user', 'queryParams']), {scope})
  }

  function listQuery (params) {
    return keys(params).reduce((acc, key) => {
      if (key.startsWith('fields.')) {
        const field = key.replace(/^fields\./, '')
        acc[field] = params[key]
      }
      return acc
    }, {})
  }

  function getQuery (req) {
    const id = req.params.id
    if (idType(model) === 'integer') {
      return {[modelApi.idProperty]: parseIfInt(id)}
    } else {
      return {[modelApi.idProperty]: id}
    }
  }

  function apiResponse (req, res, promise) {
    promise
      .then(body => jsonResponse(req, res, readableFilter(body)))
      .catch(error => errorResponse(req, res, error))
  }

  async function list (req, res) {
    const listOptions = [apiOptions(req), req.queryParams, {count: true}].reduce(merge)
    const query = scoped(req, listQuery(req.params))
    const promises = {
      list: modelApi.list(query, listOptions)
    }
    if (req.queryParams.dbStats) promises.dbStats = modelApi.dbStats()
    const formatResult = (r) => merge(r.list, {dbStats: r.dbStats})
    apiResponse(req, res, promiseAll(promises).then(formatResult))
  }

  function get (req, res) {
    const query = getQuery(req)
    const getOptions = merge(apiOptions(req), req.queryParams)
    const promise = modelApi.get(query, getOptions).then(wrapData)
    apiResponse(req, res, promise)
  }

  function create (req, res) {
    const doc = coerce(model.schema, writableDoc(model, scoped(req, req.bodyParams)))
    const promise = modelApi.create(doc, apiOptions(req)).then(wrapData)
    apiResponse(req, res, promise)
  }

  function update (req, res) {
    const query = getQuery(req)
    const doc = coerce(model.schema, updatableDoc(model, scoped(req, req.bodyParams)))
    const promise = modelApi.update(query, doc, apiOptions(req)).then(wrapData)
    apiResponse(req, res, promise)
  }

  function _delete (req, res) {
    const query = getQuery(req)
    const promise = modelApi.delete(query, apiOptions(req)).then(wrapData)
    apiResponse(req, res, promise)
  }

  return {
    model: modelApi,
    list,
    get,
    create,
    update,
    delete: _delete
  }
}

module.exports = modelController
