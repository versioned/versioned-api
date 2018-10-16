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

  function apiResponse (req, res, promise) {
    promise
      .then(body => jsonResponse(req, res, body))
      .catch(error => errorResponse(req, res, error))
  }

  async function _list (req, queryParams) {
    const listOptions = [apiOptions(req), queryParams, {count: true}].reduce(merge)
    const query = scoped(req, {})
    const api = await getApi(req.space, model)
    const promises = {
      list: api.list(query, listOptions)
    }
    if (queryParams.dbStats) promises.dbStats = api.dbStats()
    const formatResult = (r) => merge(r.list, {dbStats: r.dbStats})
    return promiseAll(promises).then(formatResult).then(readableFilter)
  }

  async function list (req, res) {
    const queryParams = req.queryParams
    apiResponse(req, res, _list(req, queryParams))
  }

  async function _get (req, id, queryParams) {
    const query = {id}
    const getOptions = merge(apiOptions(req), queryParams)
    const api = await getApi(req.space, model)
    return api.get(query, getOptions).then(wrapData).then(readableFilter)
  }

  async function get (req, res) {
    const id = req.params.id
    const queryParams = req.queryParams
    apiResponse(req, res, _get(req, id, queryParams))
  }

  async function _create (req, data, options = {}) {
    const createOptions = merge(apiOptions(req), options.createOptions)
    let doc = scoped(req, data)
    if (!createOptions.import) doc = writableDoc(model, doc)
    doc = coerce(model.schema, doc)
    const api = await getApi(req.space, model)
    return api.create(doc, createOptions).then(wrapData).then(readableFilter)
  }

  async function create (req, res) {
    apiResponse(req, res, _create(req, req.bodyParams))
  }

  async function update (req, res) {
    const query = {id: req.params.id}
    const doc = coerce(model.schema, updatableDoc(model, scoped(req, req.bodyParams)))
    const api = await getApi(req.space, model)
    const promise = api.update(query, doc, apiOptions(req)).then(wrapData).then(readableFilter)
    apiResponse(req, res, promise)
  }

  async function remove (req, res) {
    const query = {id: req.params.id}
    const api = await getApi(req.space, model)
    const promise = api.delete(query, apiOptions(req)).then(wrapData).then(readableFilter)
    apiResponse(req, res, promise)
  }

  for (let endpoint of [list, get, create, update, remove]) {
    endpoint.endpointName = `${model.type}.${endpoint.name}`
  }

  return {
    model,
    getApi,
    _list,
    list,
    _get,
    get,
    _create,
    create,
    update,
    delete: remove
  }
}

module.exports = modelController
