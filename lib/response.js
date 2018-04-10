const logger = require('app/config').logger
const {compact, nil, prettyJson} = require('lib/util')

function notFound (res) {
  res.writeHead(404, {'Content-Type': 'application/json'})
  res.end('{}')
}

function wrapData (data) {
  return {data}
}

function jsonResponse (res, data) {
  const status = nil(compact(data)) ? 404 : 200
  res.writeHead(status, {'Content-Type': 'application/json'})
  res.end(prettyJson(data))
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
  res.end(prettyJson(formatError(status, error)))
}

module.exports = {
  wrapData,
  notFound,
  jsonResponse,
  errorResponse
}
