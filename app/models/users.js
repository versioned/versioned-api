const {json, notEmpty, getIn, concat, merge} = require('lib/util')
const modelApi = require('lib/model_api')
const config = require('app/config')
const {logger, mongo} = config.modules
const jwt = require('lib/jwt')
const passwordHash = require('lib/password_hash')
const DEFAULTS = require('lib/model_spec').DEFAULTS
const {accessError} = require('lib/errors')
const requireSpaces = () => require('app/models/spaces')

const ROLES = ['read', 'write', 'admin']

function checkAccess (doc, options) {
  if (getIn(options, 'user.superUser')) return doc
  if (['update', 'delete'].includes(options.action) && doc.id !== getIn(options, 'user.id')) {
    throw accessError('A logged in user can not update or delete other users')
  }
  return doc
}

async function setDefaultSpace (doc, options) {
  const changes = options.action === 'create' || notEmpty(modelApi.changes(options.existingDoc, doc))
  if (!doc.defaultSpaceId && notEmpty(doc.accounts) && changes) {
    const spaces = await requireSpaces().list({accountId: doc.accounts[0].id}, {projection: {}})
    if (notEmpty(spaces)) return merge(doc, {defaultSpaceId: spaces[0].id})
  }
}

const model = {
  type: 'users',
  features: concat(DEFAULTS.features, ['password']),
  schema: {
    type: 'object',
    properties: {
      name: {type: 'string', minLength: 1, maxLength: 100},
      email: {
        type: 'string',
        format: 'email',
        minLength: 3,
        maxLength: 100,
        'x-meta': {unique: true}
      },
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
        },
        'x-meta': {
          relationship: {
            toType: 'accounts',
            toField: 'users',
            type: 'many-to-many'
          }
        }
      },
      defaultSpaceId: {
        type: 'string',
        'x-meta': {
          relationship: {
            toType: 'spaces',
            type: 'many-to-one',
            name: 'defaultSpace'
          }
        }
      },
      superUser: {type: 'boolean', 'x-meta': {writable: false}}
    },
    required: ['email'],
    additionalProperties: false
  },
  callbacks: {
    save: {
      afterValidation: [setDefaultSpace]
    },
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

async function login (email, password, options = {}) {
  const relationshipLevels = options.getUser ? 2 : 0
  const user = await api.get({email}, {queryParams: {relationshipLevels}})
  const success = await authenticate(user, password)
  if (success) {
    logger.debug(`users.login - auth successful email=${email}`)
    const token = generateToken(user)
    const data = {token}
    if (options.getUser) data.user = user
    return data
  } else {
    logger.info(`users.login - auth failed email=${email} password=${password} user=${json(user)}`)
    return undefined
  }
}

module.exports = merge(api, {
  ROLES,
  authenticate,
  generateToken,
  login
})
