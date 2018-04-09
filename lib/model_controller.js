const modelMeta = require('lib/model_meta')
const {readableData, writableDoc} = require('lib/model_access')
const {coerce} = require('lib/coerce')
const {jsonResponse, errorResponse} = require('lib/response')

function apiOptions (req) {
  return {user: req.user}
}

function modelController (modelApi) {
  const model = modelApi.model

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
      .then(data => jsonResponse(res, readableData(model, data)))
      .catch(error => errorResponse(res, error))
  }

  function list (req, res) {
    apiResponse(res, modelApi.list())
  }

  function get (req, res) {
    const id = getId(req)
    apiResponse(res, modelApi.get(id))
  }

  function create (req, res) {
    const doc = coerce(model.schema, writableDoc(model, req.bodyParams))
    apiResponse(res, modelApi.create(doc, apiOptions(req)))
  }

  function update (req, res) {
    const id = getId(req)
    const doc = coerce(model.schema, writableDoc(model, req.bodyParams))
    apiResponse(res, modelApi.update(id, doc, apiOptions(req)))
  }

  function _delete (req, res) {
    const id = getId(req)
    apiResponse(res, modelApi.delete(id, apiOptions(req)))
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
