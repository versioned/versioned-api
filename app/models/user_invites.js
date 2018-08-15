const assert = require('assert')
const config = require('app/config')
const modelApi = require('lib/model_api')
const {getIn, merge, empty, notEmpty, property} = require('lib/util')
const {validationError} = require('lib/errors')
const {logger, mongo} = config.modules
const accounts = require('app/models/accounts')
const users = require('app/models/users')
const emails = require('app/models/emails')

const coll = 'user_invites'

async function checkUserNotInAccount (doc, options) {
  if (!doc.email && doc.accountId) return
  const user = await users.get({email: doc.email})
  const account = await accounts.get(doc.accountId)
  if (user && account && account.users.map(property('id')).includes(user.id)) {
    throw validationError(options.model, doc, `The user with email ${doc.email} is already a member of the account ${account.name}`)
  }
}

async function setUserExists (data, options) {
  if (empty(data)) return data
  const user = await users.get({email: data.email})
  const userExists = notEmpty(user)
  return merge(data, {userExists})
}

async function sendEmail (doc, options) {
  const account = await accounts.get(doc.accountId)
  const to = doc.email
  const from = getIn(options, 'user.email')
  const subject = `You have been invited to the ${account.name} account`
  const verifyEmailUrl = `${config.UI_BASE_URL}/#/accounts/${doc.accountId}/invite-user-accept/${doc.id}`
  const body = `Please click the following link to accept the invitation and get started:\n\n${verifyEmailUrl}`
  await emails.deliver({from, to, subject, body})
}

const model = {
  coll,
  schema: {
    type: 'object',
    properties: {
      accountId: {
        type: 'string',
        'x-meta': {
          update: false,
          index: true,
          relationship: {
            toType: 'accounts',
            toField: 'userInvites',
            type: 'many-to-one',
            name: 'account'
          }
        }
      },
      email: {type: 'string', format: 'email'},
      role: {enum: users.ROLES},
      userExists: {type: 'boolean', 'x-meta': {write: false, read: true}}
    },
    required: ['accountId', 'email', 'role'],
    additionalProperties: false
  },
  callbacks: {
    save: {
      beforeValidation: [checkUserNotInAccount]
    },
    create: {
      afterSave: [sendEmail]
    },
    get: {
      after: [setUserExists]
    }
  },
  indexes: [
    {
      keys: {accountId: 1, email: 1},
      options: {unique: true}
    }
  ],
  routes: {
    list: {},
    get: {requireAuth: false},
    create: {},
    delete: {}
  }
}

const api = modelApi(model, mongo, logger)

async function accept (user, id) {
  assert(user, 'Must be logged in to accept an invite')
  const invite = await api.get(id, {allowMissing: false})
  assert.equal(invite.email, user.email, 'email must match')
  const account = await accounts.get(invite.accountId)
  const users = account.users.concat([{id: user.id, role: invite.role}])
  await accounts.update(invite.accountId, {users}, {skipCallbacks: ['checkAccess']})
  await api.delete(id)
}

module.exports = merge(api, {
  accept
})
