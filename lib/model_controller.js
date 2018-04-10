const {merge} = require('lib/util')
const modelMeta = require('lib/model_meta')
const {readableData, writableDoc, updatableDoc} = require('lib/model_access')
const {coerce} = require('lib/coerce')
const {jsonResponse, errorResponse, wrapData} = require('lib/response')
const {promiseAll} = require('lib/promise_helper')

function apiOptions (req) {
  return {user: req.user}
}

function modelController (modelApi) {
  const model = modelApi.model

  function readableFilter (body) {
    return merge(body, {data: readableData(model, body.data)})
  }

  function getId (req) {
    const id = req.params.id
    if (modelMeta.idType(model) === 'integer' && id && id.match(/^\d+$/)) {
      return parseInt(id)
    } else {
      return id
    }
  }

  function apiResponse (res, promise) {
    promise
      .then(body => jsonResponse(res, readableFilter(body)))
      .catch(error => errorResponse(res, error))
  }

  async function list (req, res) {
    const promises = {
      data: modelApi.list(),
      stats: modelApi.stats()
    }
    apiResponse(res, promiseAll(promises))
  }

  function get (req, res) {
    const id = getId(req)
    apiResponse(res, modelApi.get(id).then(wrapData))
  }

  function create (req, res) {
    const doc = coerce(model.schema, writableDoc(model, req.bodyParams))
    apiResponse(res, modelApi.create(doc, apiOptions(req)).then(wrapData))
  }

  function update (req, res) {
    const id = getId(req)
    const doc = coerce(model.schema, updatableDoc(model, req.bodyParams))
    apiResponse(res, modelApi.update(id, doc, apiOptions(req)).then(wrapData))
  }

  function _delete (req, res) {
    const id = getId(req)
    apiResponse(res, modelApi.delete(id, apiOptions(req)).then(wrapData))
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
