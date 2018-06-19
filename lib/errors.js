const {pick, json, compact} = require('lib/util')
const {readableDoc} = require('lib/model_access')

function accessError (message) {
  return message && {status: 401, errors: [{type: 'access', message}]}
}

function dbResultError (model, doc, dbResult, message) {
  return {
    status: 500,
    errors: [{type: 'dbError', message, dbResult}],
    doc: readableDoc(model, doc)
  }
}

function validationError (model, doc, message, field) {
  return {
    status: 422,
    errors: [compact({field, message})],
    model: pick(model, ['type', 'schema']),
    doc: readableDoc(model, doc)
  }
}

function missingError (model, queryOrId) {
  return {
    status: 404,
    model: pick(model, ['type', 'schema']),
    errors: [{type: 'missing', message: `Could not find find document with queryOrId=${json(queryOrId)}`}]
  }
}

function unchangedError (model, existingDoc, updatedDoc) {
  return {
    status: 204,
    errors: [{type: 'unchanged', message: `No changes made to document`}],
    existingDoc: readableDoc(model, existingDoc),
    updatedDoc: readableDoc(model, updatedDoc)
  }
}

module.exports = {
  accessError,
  dbResultError,
  validationError,
  missingError,
  unchangedError
}
