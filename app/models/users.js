const {merge} = require('lib/util')
const modelApi = require('lib/model_api')
const config = require('app/config')
const jwt = require('lib/jwt')
const passwordHash = require('lib/password_hash')

const model = {
  coll: 'users',
  schema: {
    type: 'object',
    properties: {
      name: {type: 'string'},
      email: {type: 'string', format: 'email', 'x-meta': {unique: true}},
      password: {type: 'string', minLength: 4, maxLength: 100, 'x-meta': {readable: false}}
    },
    required: ['name', 'email', 'password'],
    additionalProperties: false
  }
}

const api = modelApi(model)

async function create (doc) {
  const hash = await passwordHash.generate(doc.password)
  const dbDoc = merge(doc, {password: hash})
  return api.create(dbDoc)
}

function authenticate (user, password) {
  const hash = user && user.password
  return passwordHash.verify(password, hash)
}

function generateToken (doc) {
  const exp = Date.now() / 1000 + config.JWT_EXPIRY
  const payload = {user_id: doc.id, exp}
  return jwt.encode(payload, config.JWT_SECRET)
}

module.exports = merge(api, {
  create,
  authenticate,
  generateToken
})
