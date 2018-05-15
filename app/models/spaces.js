const config = require('app/config')
const {dbFriendly, urlFriendly, empty, notEmpty, getIn, property, uuid, merge} = require('lib/util')
const modelApi = require('lib/model_api')
const {logger, mongo} = require('app/config').modules
const MongoClient = require('mongodb').MongoClient
const mongoModule = require('lib/mongo')
const accounts = require('app/models/accounts')
const {validationError} = require('lib/errors')

const coll = 'spaces'
const DB_KEY_LENGTH = 8 // 16^8 ~ 1 billion
const DB_KEY_PREFIX = 's'

const mongoCache = {}

const keySchema = getIn(accounts, 'model.schema.properties.key')

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

async function findAvailableKey (propertyName, startKey) {
  let key, keyExists
  const MAX_ATTEMPTS = 1000
  let attempts = 0
  do {
    if (attempts === 0 && notEmpty(startKey)) {
      key = DB_KEY_PREFIX + (dbFriendly(startKey, DB_KEY_LENGTH) || uuid(DB_KEY_LENGTH))
    } else {
      key = DB_KEY_PREFIX + uuid(DB_KEY_LENGTH)
    }
    const query = {[propertyName]: key}
    keyExists = await modelApi({coll}, mongo).get(query)
    attempts += 1
    if (attempts > MAX_ATTEMPTS) throw new Error(`Could not find available space key after ${MAX_ATTEMPTS} attempts`)
  } while (keyExists)
  return key
}

async function setDefaultKey (doc, options) {
  if (empty(doc.key) && notEmpty(doc.name)) {
    const account = doc.accountId && (await accounts.get(doc.accountId))
    let prefix = account ? `${account.key}-` : ''
    const key = (prefix + urlFriendly(doc.name)).substring(0, keySchema.maxLength).replace(/^-+|-+$/g, '')
    return merge(doc, {key})
  }
}

async function setDbKey (doc, options) {
  const dbKey = await findAvailableKey('dbKey', doc.key)
  return merge(doc, {dbKey})
}

async function validateDatabaseUrl (doc, options) {
  if (doc.databaseUrl) {
    try {
      await MongoClient.connect(doc.databaseUrl)
    } catch (err) {
      throw validationError(options.model, doc, `Could not connect to databaseUrl=${doc.databaseUrl}`, 'databaseUrl')
    }
  }
  return doc
}

async function checkAccess (doc, options) {
  if (doc.accountId) {
    const account = await accounts.get(doc.accountId)
    if (!account) throw validationError(options.model, doc, `Could not find account ${doc.accountId}`, 'accountId')
    const adminIds = account.users.filter(u => u.role === 'admin').map(property('id'))
    const userId = getIn(options, 'user.id')
    if (!adminIds.includes(userId)) {
      throw validationError(options.model, doc, `In order to create a space you need to have the administrator role`, 'accountId')
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
        'x-meta': {writable: false, unique: true}
      },
      key: keySchema,
      databaseUrl: {type: 'string'}
    },
    required: ['name', 'accountId', 'dbKey', 'key'],
    additionalProperties: false
  },
  callbacks: {
    create: {
      beforeValidation: [setDefaultKey, setDbKey, validateDatabaseUrl, checkAccess]
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
