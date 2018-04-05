const {nil, json} = require('lib/util')
const logger = require('app/config').logger
const modelMeta = require('lib/model_meta')
const {readableData, writableDoc} = require('lib/model_access')
const {coerce} = require('lib/coerce')

function jsonResponse (res, data) {
  const status = nil(data) ? 404 : 200
  res.writeHead(status, {'Content-Type': 'application/json'})
  res.end(json(data))
}

function formatError (status, error) {
  if (error instanceof Error) {
    return {status, errors: [error.message]}
  } else {
    return error
  }
}

// The 422 (Unprocessable Entity) status code means the server understands the content type
// of the request entity (hence a 415 (Unsupported Media Type) status code is inappropriate),
// and the syntax of the request entity is correct (thus a 400 (Bad Request) status code is inappropriate)
// but was unable to process the contained instructions. For example, this error condition
// may occur if an XML request body contains well-formed (i.e., syntactically correct),
// but semantically erroneous, XML instructions.
function errorResponse (res, error) {
  const status = error.status || 500
  logger.info(`errorResponse status=${status}`, error)
  res.writeHead(status, {'Content-Type': 'application/json'})
  res.end(json(formatError(status, error)))
}

function apiOptions (req) {
  return {user: req.user}
}

function modelController (modelApi) {
  const model = modelApi.model

  function getId (req) {
    const id = req.params.id
    return modelMeta.idType(model) === 'integer' ? parseInt(id) : id
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
