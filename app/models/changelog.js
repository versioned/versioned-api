const {logger, mongo} = require('app/config').modules
const modelApi = require('lib/model_api')

const model = {
  coll: 'changelog',
  features: ['audit'],
  schema: {
    type: 'object',
    properties: {
      action: {enum: ['create', 'update', 'delete']},
      doc: {type: 'object'},
      changes: {type: 'object'}
    },
    required: ['action', 'doc'],
    additionalProperties: false
  },
  routes: ['list', 'get']
}

module.exports = modelApi(model, mongo, logger)
