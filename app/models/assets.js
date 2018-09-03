const config = require('app/config')
const {logger, mongo} = config.modules
const modelApi = require('lib/model_api')

const coll = 'assets'

const model = {
  coll,
  schema: {
    type: 'object',
    properties: {
      title: {type: 'string', maxLength: 256},
      description: {type: 'string', maxLength: 1000, 'x-meta': {index: false}},
      url: {type: 'string'},
      originalFilename: {type: 'string'},
      fileType: {type: 'string'},
      fileExtension: {type: 'string'},
      meta: {type: 'object'},
      spaceId: {
        type: 'string',
        'x-meta': {
          update: false,
          index: true,
          relationship: {
            toType: 'spaces',
            name: 'space',
            type: 'many-to-one',
            onDelete: 'cascade'
          }
        }
      }
    },
    required: ['spaceId', 'url', 'title'],
    additionalProperties: false
  },
  indexes: [
    {
      keys: {spaceId: 1, title: 1},
      options: {unique: true}
    }
  ]
}

const api = modelApi(model, mongo, logger)

module.exports = api
