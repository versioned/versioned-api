const {json} = require('lib/util')

function jsonResponse (res, data) {
  res.writeHead(200, {'Content-Type': 'application/json'})
  res.end(json(data))
}

// The 422 (Unprocessable Entity) status code means the server understands the content type
// of the request entity (hence a 415 (Unsupported Media Type) status code is inappropriate),
// and the syntax of the request entity is correct (thus a 400 (Bad Request) status code is inappropriate)
// but was unable to process the contained instructions. For example, this error condition
// may occur if an XML request body contains well-formed (i.e., syntactically correct),
// but semantically erroneous, XML instructions.
function invalidResponse (res, error) {
  res.writeHead(422, {'Content-Type': 'application/json'})
  res.end(json(error))
}

function apiResponse (res, promise) {
  promise
    .then(data => jsonResponse(res, data))
    .catch(error => invalidResponse(res, error))
}

function modelController (modelApi) {
  function list (req, res) {
    apiResponse(res, modelApi.list())
  }

  function get (req, res) {
    const id = req.params.id
    apiResponse(res, modelApi.get(id))
  }

  function create (req, res) {
    const doc = req.params
    apiResponse(res, modelApi.create(doc))
  }

  function update (req, res) {
    const doc = req.params
    apiResponse(res, modelApi.update(doc))
  }

  function _delete (req, res) {
    const id = req.params.id
    apiResponse(res, modelApi.delete(id))
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
