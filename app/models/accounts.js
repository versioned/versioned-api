const {toString, find, getIn, concat, merge, property} = require('lib/util')
const {logger, mongo} = require('app/config').modules
const modelApi = require('lib/model_api')
const diff = require('lib/diff')
const users = require('app/models/users')
const {validationError, accessError} = require('lib/errors')

const PLANS = ['shared', 'dedicated']
const DEFAULT_PLAN = 'shared'

function usersDiff (fromUsers, toUsers) {
  if (!fromUsers) return {added: toUsers, removed: [], changed: []}
  const added = toUsers.filter(u => !fromUsers.map(property('id')).includes(u.id))
  const removed = fromUsers.filter(u => !toUsers.map(property('id')).includes(u.id))
  const changed = toUsers.filter(to => {
    const from = fromUsers.find(u => u.id === to.id)
    return from && diff(from, to)
  })
  return {added, removed, changed}
}

// ///////////////////////////////////////
// CALLBACKS
// ///////////////////////////////////////

function checkAccess (doc, options) {
  if (getIn(options, 'user.superUser')) return doc
  const userId = toString(getIn(options, 'user.id'))
  const isAccountAdmin = find(doc.users, (u) => u.id === userId && u.role === 'admin')
  if (['update', 'delete'].includes(options.action) && !isAccountAdmin) {
    throw accessError('You must be granted admin privileges to update or delete an account')
  }
  return doc
}

function setDefaultPlan (doc, options) {
  return merge({plan: DEFAULT_PLAN}, doc)
}

function setDefaultAdmin (doc, options) {
  if (options.user && !(doc.users || []).map(property('id')).includes(options.user.id)) {
    const users = concat(doc.users, [{id: options.user.id, role: 'admin'}])
    return merge(doc, {users})
  } else {
    return doc
  }
}

function validateOneAdmin (doc, options) {
  if (!(doc.users || []).find(u => u.role === 'admin')) {
    throw validationError(options.model, doc, 'Each account must have at least one administrator')
  }
  return doc
}

async function updateUsersRelationship (doc, options) {
  const existingUsers = getIn(options, ['existingDoc', 'users'])
  const {added, removed, changed} = usersDiff(existingUsers, doc.users)
  const accountId = doc.id
  logger.verbose('updateUsersRelationship', added, removed, changed)
  for (let {id, role} of added) {
    const account = {id: accountId, role}
    const addAccount = (accounts) => concat(accounts, [account])
    await users.update(id, {}, {callbacks: false, evolve: {accounts: addAccount}})
  }
  for (let {id} of removed) {
    const removeAccount = (accounts) => accounts.filter(a => a.id !== accountId)
    await users.update(id, {}, {callbacks: false, evolve: {accounts: removeAccount}})
  }
  for (let {id, role} of changed) {
    const account = {id: accountId, role}
    const updateAccount = (accounts) => accounts.map(a => a.id === accountId ? merge(a, account) : a)
    await users.update(id, {}, {callbacks: false, evolve: {accounts: updateAccount}})
  }
  return doc
}

const model = {
  coll: 'accounts',
  schema: {
    type: 'object',
    properties: {
      name: {type: 'string'},
      plan: {enum: PLANS},
      users: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {type: 'string'},
            role: {enum: users.ROLES}
          },
          required: ['id', 'role'],
          additionalProperties: false
        }
      }
    },
    required: ['name', 'plan', 'users'],
    additionalProperties: false
  },
  callbacks: {
    save: {
      afterSave: [updateUsersRelationship]
    },
    create: {
      beforeValidation: [setDefaultPlan, setDefaultAdmin, validateOneAdmin]
    },
    update: {
      afterValidation: [checkAccess]
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

module.exports = modelApi(model, mongo, logger)
