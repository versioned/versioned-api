const {empty, find, toString, getIn, concat, merge} = require('lib/util')
const modelApi = require('lib/model_api')
const config = require('app/config')
const {logger, mongo} = config.modules
const jwt = require('lib/jwt')
const passwordHash = require('lib/password_hash')
const DEFAULTS = require('lib/model_spec').DEFAULTS
const {accessError} = require('app/errors')

const ROLES = ['read', 'write', 'admin']

function checkAccess (doc, options) {
  if (getIn(options, 'user.superUser')) return doc
  if (['update', 'delete'].includes(options.action) && toString(doc._id) !== toString(getIn(options, 'user._id'))) {
    throw accessError('A logged in user can not update or delete other users')
  }
  return doc
}

const model = {
  coll: 'users',
  features: concat(DEFAULTS.features, ['password']),
  schema: {
    type: 'object',
    properties: {
      name: {type: 'string'},
      email: {type: 'string', format: 'email', 'x-meta': {unique: true}},
      accounts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {type: 'string'},
            role: {enum: ROLES}
          },
          required: ['id', 'role'],
          additionalProperties: false
        }
      },
      defaultSpaceId: {type: 'string'},
      superUser: {type: 'boolean', 'x-meta': {writable: false}}
    },
    required: ['name', 'email'],
    additionalProperties: false
  },
  callbacks: {
    update: {
      beforeValidation: [checkAccess]
    },
    delete: {
      before: [checkAccess]
    }
  },
  routes: {
    list: {superUser: true},
    get: {},
    create: {},
    update: {},
    delete: {}
  }
}

const api = modelApi(model, mongo, logger)

function authenticate (user, password) {
  return user && passwordHash.verify(password, user.passwordHash)
}

function generateToken (doc) {
  const exp = Date.now() / 1000 + config.JWT_EXPIRY
  const userId = doc[api.idProperty]
  const payload = {userId, exp}
  return jwt.encode(payload, config.JWT_SECRET)
}

async function getDefaultSpace (user) {
  const spacesApi = modelApi({coll: 'spaces'}, mongo, logger)
  const defaultSpace = user.defaultSpaceId && (await spacesApi.get(user.defaultSpaceId))
  if (defaultSpace && find(user.accounts, a => a.id === defaultSpace.accountId)) {
    return defaultSpace
  } else {
    return undefined
  }
}

async function getDefaultAccountAndSpace (user) {
  if (empty(user.accounts)) return {}
  const defaultSpace = await getDefaultSpace(user)
  const accountsApi = modelApi({coll: 'accounts'}, mongo, logger)
  if (defaultSpace) {
    const account = await accountsApi.get(defaultSpace.accountId)
    return {account, space: defaultSpace}
  } else {
    const accountId = user.accounts[0].id
    const account = await accountsApi.get(accountId)
    const spacesApi = modelApi({coll: 'spaces'}, mongo, logger)
    const space = await spacesApi.findOne({accountId})
    return {account, space}
  }
}

module.exports = merge(api, {
  ROLES,
  authenticate,
  generateToken,
  getDefaultAccountAndSpace
})
