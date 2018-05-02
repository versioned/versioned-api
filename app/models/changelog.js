const {logger, mongo} = require('app/config').modules
const modelApi = require('lib/model_api')

const model = {
  coll: 'changelog',
  features: ['mongo_id', 'audit'],
  schema: {
    type: 'object',
    properties: {
      accountId: {type: 'string', 'x-meta': {write: false, index: true}},
      spaceId: {type: 'string', 'x-meta': {write: false, index: true}},
      action: {enum: ['create', 'update', 'delete']},
      coll: {type: 'string'},
      existingDoc: {type: 'object'},
      doc: {type: 'object'},
      changes: {type: 'object'}
    },
    required: ['action', 'coll', 'doc'],
    additionalProperties: false
  },
  indexes: [
    {
      keys: {coll: 1, 'doc.id': 1}
    }
  ],
  routes: ['list', 'get']
}

module.exports = modelApi(model, mongo, logger)
