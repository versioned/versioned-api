const {concat, merge} = require('lib/util')
const modelApi = require('lib/model_api')
const config = require('app/config')
const {logger, mongo} = config.modules
const jwt = require('lib/jwt')
const passwordHash = require('lib/password_hash')
const DEFAULTS = require('lib/model_spec').DEFAULTS

const ROLES = ['read', 'write', 'admin']

const model = {
  coll: 'users',
  features: concat(DEFAULTS.features, ['password']),
  schema: {
    type: 'object',
    'x-meta': {
      checkAccess: false
    },
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
      superUser: {type: 'boolean', 'x-meta': {writable: false}}
    },
    required: ['name', 'email'],
    additionalProperties: false
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

module.exports = merge(api, {
  ROLES,
  authenticate,
  generateToken
})
