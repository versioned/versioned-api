const config = require('app/config')
const {getIn, property, merge} = require('lib/util')
const modelApi = require('lib/model_api')
const {logger, mongo} = require('app/config').modules
const MongoClient = require('mongodb').MongoClient
const mongoModule = require('lib/mongo')
const accounts = require('app/models/accounts')
const {validationError} = require('lib/errors')
const {findAvailableKey} = require('lib/unique_key')

const coll = 'spaces'
const DB_KEY_LENGTH = 8 // 16^8 ~ 1 billion
const DB_KEY_PREFIX = 's'

const mongoCache = {}

async function getMongo (space) {
  if (space.databaseUrl) {
    if (mongoCache[space.id]) return mongoCache[space.id]
    const mongo = mongoModule(space.databaseUrl)
    await mongo.connect()
    mongoCache[space.id] = mongo
    return mongo
  } else {
    return config.modules.mongo
  }
}

async function setDbKey (doc, options) {
  const dbKey = await findAvailableKey(mongo, coll, 'dbKey', {length: DB_KEY_LENGTH, prefix: DB_KEY_PREFIX})
  return merge(doc, {dbKey})
}

async function validateDatabaseUrl (doc, options) {
  if (doc.databaseUrl) {
    try {
      await MongoClient.connect(doc.databaseUrl)
    } catch (err) {
      throw validationError(options.model, doc, `could not connect to '${doc.databaseUrl}'`, 'databaseUrl')
    }
  }
  return doc
}

async function checkAccess (doc, options) {
  if (doc.accountId) {
    const account = await accounts.get(doc.accountId)
    if (!account) throw validationError(options.model, doc, `could not find account ${doc.accountId}`, 'accountId')
    const adminIds = account.users.filter(u => u.role === 'admin').map(property('id'))
    const userId = getIn(options, 'user.id')
    if (!adminIds.includes(userId)) {
      throw validationError(options.model, doc, `to create a space you need to have the administrator role`)
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
      accountId: {
        type: 'string',
        'x-meta': {
          update: false,
          index: true,
          relationship: {
            toType: 'accounts',
            toField: 'spaces',
            name: 'account',
            type: 'many-to-one'
          }
        }
      },
      models: {
        type: 'array',
        items: {type: 'string'},
        'x-meta': {
          writable: false,
          relationship: {
            toType: 'models',
            toField: 'spaceId',
            type: 'one-to-many'
          }
        }
      },
      dbKey: {
        type: 'string',
        pattern: `^${DB_KEY_PREFIX}[a-z0-9_]+$`,
        maxLength: (DB_KEY_LENGTH + DB_KEY_PREFIX.length),
        'x-meta': {writable: false, unique: {index: true}}
      },
      databaseUrl: {type: 'string'},
      config: {
        type: 'object',
        properties: {
          ALGOLIASEARCH_APPLICATION_ID: {type: 'string'},
          ALGOLIASEARCH_API_KEY: {type: 'string'}
        },
        additionalProperties: false
      }
    },
    required: ['name', 'accountId', 'dbKey'],
    additionalProperties: false
  },
  callbacks: {
    create: {
      beforeValidation: [setDbKey, validateDatabaseUrl, checkAccess]
    }
  },
  indexes: [
    {
      keys: {name: 1, accountId: 1},
      options: {unique: true}
    }
  ]
}

module.exports = Object.assign(modelApi(model, mongo, logger), {
  getMongo
})
