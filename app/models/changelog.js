const {merge, empty, isArray} = require('lib/util')
const {logger, mongo} = require('app/config').modules
const modelApi = require('lib/model_api')

function docWithChanges (doc) {
  if (!doc.changes) return doc
  const changes = doc.changes.reduce((acc, {path, change}) => {
    acc[path] = change
    return acc
  }, {})
  return merge(doc, {changes})
}

function setChanges (data, options) {
  if (empty(data)) {
    return data
  } else if (isArray(data)) {
    return data.map(docWithChanges)
  } else {
    return docWithChanges(data)
  }
}

const model = {
  type: 'changelog',
  features: ['mongo_id', 'typed', 'audit'],
  schema: {
    type: 'object',
    properties: {
      accountId: {type: 'string', 'x-meta': {write: false, index: true}},
      spaceId: {type: 'string', 'x-meta': {write: false, index: true}},
      action: {enum: ['create', 'update', 'delete']},
      model: {type: 'object'},
      coll: {type: 'string'},
      existingDoc: {type: 'object'},
      doc: {type: 'object'},
      changes: {type: 'array', items: {type: 'object'}},
      publishEvent: {enum: ['first-publish', 'republish', 'publish-change', 'unpublish']}
    },
    required: ['action', 'coll', 'doc'],
    additionalProperties: false
  },
  callbacks: {
    list: {
      after: [setChanges]
    },
    get: {
      after: [setChanges]
    }
  },
  indexes: [
    {
      keys: {coll: 1, 'doc.id': 1}
    }
  ],
  routes: ['list', 'get']
}

module.exports = modelApi(model, mongo, logger)
