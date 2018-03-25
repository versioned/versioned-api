const {merge} = require('lib/util')
const db = require('lib/mongo').db
const config = require('app/config')
const jwt = require('lib/jwt')
const passwordHash = require('lib/password_hash')

const coll = 'users'

const schema = {
  type: 'object',
  properties: {
    name: {type: 'string'},
    email: {type: 'string'},
    password: {type: 'string', 'x-meta': {api_readable: false}}
  },
  required: ['name', 'email', 'password'],
  additionalProperties: false
}

async function init() {
  return await db().collection(coll).createIndex({email: 1}, {unique: true})
}

async function create(doc) {
  // TODO: validate schema
  await init()
  const hash = await passwordHash.generate(doc.password)
  const dbDoc = merge(doc, {password: hash})
  return db().collection(coll).insert(dbDoc)
}

function findOne(query) {
  return db().collection(coll).findOne(query)
}

function authenticate(user, password) {
  const hash = user && user.password
  return passwordHash.verify(password, hash)
}

function generateToken(doc) {
  const payload = {id: doc.id}
  return jwt.encode(payload, config.JWT_SECRET)
}

module.exports = {
  init,
  create,
  findOne,
  authenticate,
  generateToken
}
