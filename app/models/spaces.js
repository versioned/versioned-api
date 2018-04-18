const {uuid, merge} = require('lib/util')
const modelApi = require('lib/model_api')
const {logger} = require('app/config')

const coll = 'spaces'
const KEY_LENGTH = 8 // 16^8 ~ 1 billion
const KEY_PREFIX = 's'

async function findAvailableKey () {
  let key, keyExists
  const MAX_ATTEMPTS = 1000
  let attempts = 0
  do {
    key = uuid(KEY_LENGTH)
    keyExists = await modelApi({coll}).findOne({key})
    attempts += 1
    if (attempts > MAX_ATTEMPTS) throw new Error(`Could not find available space key after ${MAX_ATTEMPTS} attempts`)
  } while (keyExists)
  return KEY_PREFIX + key
}

async function setKeyCallback (doc, options) {
  const key = await findAvailableKey()
  return merge(doc, {key})
}

const model = {
  coll,
  schema: {
    type: 'object',
    properties: {
      name: {type: 'string'},
      key: {
        type: 'string',
        pattern: `^${KEY_PREFIX}[abcdef0-9]{${KEY_LENGTH}}$`,
        'x-meta': {writable: false, unique: true}
      }
    },
    required: ['name', 'key'],
    additionalProperties: false
  },
  callbacks: {
    create: {
      beforeValidation: [setKeyCallback]
    }
  }
}

module.exports = modelApi(model, logger)
