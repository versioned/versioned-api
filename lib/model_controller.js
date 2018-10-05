const {pick, merge} = require('lib/util')
const {readableData, writableDoc, updatableDoc} = require('lib/model_access')
const {coerce} = require('lib/coerce')
const {promiseAll} = require('lib/promise_helper')

function modelController (model, getApi, responseModule, options = {}) {
  const {jsonResponse, errorResponse, wrapData} = responseModule

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

  function getQuery (req) {
    return {id: req.params.id}
  }

  function apiResponse (req, res, promise) {
    promise
      .then(body => jsonResponse(req, res, readableFilter(body)))
      .catch(error => errorResponse(req, res, error))
  }

  async function list (req, res) {
    const listOptions = [apiOptions(req), req.queryParams, {count: true}].reduce(merge)
    const query = scoped(req, {})
    const api = await getApi(req.space, model)
    const promises = {
      list: api.list(query, listOptions)
    }
    if (req.queryParams.dbStats) promises.dbStats = api.dbStats()
    const formatResult = (r) => merge(r.list, {dbStats: r.dbStats})
    apiResponse(req, res, promiseAll(promises).then(formatResult))
  }

  async function get (req, res) {
    const query = getQuery(req)
    const getOptions = merge(apiOptions(req), req.queryParams)
    const api = await getApi(req.space, model)
    const promise = api.get(query, getOptions).then(wrapData)
    apiResponse(req, res, promise)
  }

  async function _create (req, res, data, options = {}) {
    const createOptions = merge(apiOptions(req), options.createOptions)
    let doc = scoped(req, data)
    if (!createOptions.import) doc = writableDoc(model, doc)
    doc = coerce(model.schema, doc)
    const api = await getApi(req.space, model)
    return api.create(doc, createOptions).then(wrapData)
  }

  async function create (req, res) {
    apiResponse(req, res, _create(req, res, req.bodyParams))
  }

  async function update (req, res) {
    const query = getQuery(req)
    const doc = coerce(model.schema, updatableDoc(model, scoped(req, req.bodyParams)))
    const api = await getApi(req.space, model)
    const promise = api.update(query, doc, apiOptions(req)).then(wrapData)
    apiResponse(req, res, promise)
  }

  async function _delete (req, res) {
    const query = getQuery(req)
    const api = await getApi(req.space, model)
    const promise = api.delete(query, apiOptions(req)).then(wrapData)
    apiResponse(req, res, promise)
  }

  for (let endpoint of [list, get, create, update, _delete]) {
    endpoint.endpointName = `${model.type}.${endpoint.name}`
  }

  return {
    model,
    getApi,
    list,
    get,
    _create,
    create,
    update,
    delete: _delete
  }
}

module.exports = modelController
