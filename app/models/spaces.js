const {uuid, merge} = require('lib/util')
const modelApi = require('lib/model_api')
const {logger, mongo} = require('app/config').modules
const MongoClient = require('mongodb').MongoClient

const coll = 'spaces'
const KEY_LENGTH = 8 // 16^8 ~ 1 billion
const KEY_PREFIX = 's'

async function findAvailableKey () {
  let key, keyExists
  const MAX_ATTEMPTS = 1000
  let attempts = 0
  do {
    key = uuid(KEY_LENGTH)
    keyExists = await modelApi({coll}, mongo).findOne({key})
    attempts += 1
    if (attempts > MAX_ATTEMPTS) throw new Error(`Could not find available space key after ${MAX_ATTEMPTS} attempts`)
  } while (keyExists)
  return KEY_PREFIX + key
}

async function setKeyCallback (doc, options) {
  const key = await findAvailableKey()
  return merge(doc, {key})
}

async function validateDatabaseUrl (doc, options) {
  if (doc.databaseUrl) {
    try {
      await MongoClient.connect(doc.databaseUrl)
    } catch (err) {
      throw modelApi.validationError(`Could not connect to databaseUrl=${doc.databaseUrl}`, 'databaseUrl')
    }
  }
  return doc
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
      },
      databaseUrl: {type: 'string'}
    },
    required: ['name', 'key'],
    additionalProperties: false
  },
  callbacks: {
    create: {
      beforeValidation: [setKeyCallback, validateDatabaseUrl]
    }
  }
}

module.exports = modelApi(model, mongo, logger)
