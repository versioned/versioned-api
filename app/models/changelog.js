const modelApi = require('lib/model_api')

const model = {
  coll: 'sys_changelog',
  features: ['integer_id', 'audit'],
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

const api = modelApi(model)

module.exports = api
