const modelApi = require('lib/model_api')

const model = {
  coll: 'users',
  schema: {
    type: 'object',
    properties: {
      name: {type: 'string'}
    },
    required: ['name'],
    additionalProperties: false
  }
}

module.exports = modelApi(model)
