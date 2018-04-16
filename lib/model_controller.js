const {keys, merge, parseIfInt} = require('lib/util')
const {idType} = require('lib/model_meta')
const {readableData, writableDoc, updatableDoc} = require('lib/model_access')
const {coerce} = require('lib/coerce')
const {promiseAll} = require('lib/promise_helper')

function apiOptions (req) {
  return {user: req.user}
}

function modelController (modelApi, responseModule) {
  const {jsonResponse, errorResponse, wrapData} = responseModule
  const model = modelApi.model

  function readableFilter (body) {
    return merge(body, {data: readableData(model, body.data)})
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

  function getId (req) {
    const id = req.params.id
    if (idType(model) === 'integer') {
      return parseIfInt(id)
    } else {
      return id
    }
  }

  function apiResponse (req, res, promise) {
    promise
      .then(body => jsonResponse(req, res, readableFilter(body)))
      .catch(error => errorResponse(req, res, error))
  }

  async function list (req, res) {
    const promises = {
      data: modelApi.list(listQuery(req.params), req.params),
      stats: modelApi.stats()
    }
    apiResponse(req, res, promiseAll(promises))
  }

  function get (req, res) {
    const id = getId(req)
    const promise = modelApi.get(id).then(wrapData)
    apiResponse(req, res, promise)
  }

  function create (req, res) {
    const doc = coerce(model.schema, writableDoc(model, req.bodyParams))
    const promise = modelApi.create(doc, apiOptions(req)).then(wrapData)
    apiResponse(req, res, promise)
  }

  function update (req, res) {
    const id = getId(req)
    const doc = coerce(model.schema, updatableDoc(model, req.bodyParams))
    const promise = modelApi.update(id, doc, apiOptions(req)).then(wrapData)
    apiResponse(req, res, promise)
  }

  function _delete (req, res) {
    const id = getId(req)
    const promise = modelApi.delete(id, apiOptions(req)).then(wrapData)
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
