const {merge} = require('lib/util')
const {db, formatDbError, createIndexes} = require('lib/mongo')
const config = require('app/config')
const logger = config.logger
const jwt = require('lib/jwt')
const passwordHash = require('lib/password_hash')
const jsonSchema = require('lib/json_schema')

const coll = 'users'

const schema = {
  type: 'object',
  properties: {
    name: {type: 'string'},
    email: {type: 'string', format: 'email', 'x-meta': {unique: true}},
    password: {type: 'string', minLength: 4, maxLength: 100, 'x-meta': {api_readable: false}}
  },
  required: ['name', 'email', 'password'],
  additionalProperties: false
}

async function create (doc) {
  const errors = jsonSchema.validate(schema, doc)
  logger.debug(`users.create doc=${JSON.stringify(doc)} errors=${JSON.stringify(errors)}`)
  if (errors) return Promise.reject(errors)
  await createIndexes(coll, schema)
  const hash = await passwordHash.generate(doc.password)
  const dbDoc = merge(doc, {password: hash})
  return db().collection(coll).insert(dbDoc)
    .then(result => result.ops[0])
    .catch(dbError => {
      logger.debug(`users.create dbError dbError=${JSON.stringify(dbError)}`)
      throw formatDbError(dbError)
    })
}

function findOne (query) {
  return db().collection(coll).findOne(query)
}

function authenticate (user, password) {
  const hash = user && user.password
  return passwordHash.verify(password, hash)
}

function generateToken (doc) {
  const payload = {id: doc.id}
  return jwt.encode(payload, config.JWT_SECRET)
}

module.exports = {
  create,
  findOne,
  authenticate,
  generateToken
}
