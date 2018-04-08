const modelApi = require('lib/model_api')

const model = {
  coll: 'sys_accounts',
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
