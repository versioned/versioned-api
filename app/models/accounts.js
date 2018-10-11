const {keys, find, getIn, concat, merge, property} = require('lib/util')
const {logger, mongo} = require('app/config').modules
const modelApi = require('lib/model_api')
const users = require('app/models/users')
const {validationError, accessError} = require('lib/errors')
const {PLANS, DEFAULT_PLAN} = require('app/plans')
const requireSpaces = () => require('app/models/spaces')

// ///////////////////////////////////////
// CALLBACKS
// ///////////////////////////////////////

function checkAccess (doc, options) {
  if (getIn(options, 'user.superUser')) return
  const isAccountAdmin = find(options.user.accounts, (a) => a.id === doc.id && a.role === 'admin')
  if (['update', 'delete'].includes(options.action) && !isAccountAdmin) {
    throw accessError('You must be granted admin privileges to update or delete an account')
  }
  return doc
}

function checkNumberOfUsers (doc, options) {
  if (!doc.users) return
  const plan = PLANS[doc.plan]
  if (doc.users.length > plan.USERS_LIMIT) {
    throw validationError(options.model, doc, `You cannot have more than ${plan.USERS_LIMIT} users in your account on your current plan (${doc.plan}). Please upgrade or contact support if you need more users.`)
  }
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
    throw validationError(options.model, doc, 'Each account must have at least one administrator', 'users')
  }
  return doc
}

async function createDefaultSpace (doc, options) {
  const spaceDoc = {name: doc.name, accountId: doc.id}
  await requireSpaces().create(spaceDoc, {skipCallbacks: ['checkAccess']})
  return doc
}

const model = {
  type: 'accounts',
  schema: {
    type: 'object',
    properties: {
      name: {type: 'string', 'x-meta': {unique: {index: true}}},
      plan: {enum: keys(PLANS)},
      spaces: {
        type: 'array',
        items: {type: 'string'},
        'x-meta': {
          writable: false,
          relationship: {
            toTypes: ['spaces'],
            toField: 'accountId',
            type: 'one-to-many'
          }
        }
      },
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
        },
        'x-meta': {
          relationship: {
            toTypes: ['users'],
            toField: 'accounts',
            type: 'many-to-many'
          }
        }
      },
      userInvites: {
        type: 'array',
        items: {type: 'string'},
        'x-meta': {
          writable: false,
          relationship: {
            toTypes: ['user_invites'],
            toField: 'accountId',
            type: 'one-to-many'
          }
        }
      }
    },
    required: ['name', 'plan', 'users'],
    additionalProperties: false
  },
  callbacks: {
    create: {
      beforeValidation: [setDefaultPlan, setDefaultAdmin, validateOneAdmin],
      afterSave: [createDefaultSpace]
    },
    update: {
      afterValidation: [checkAccess, checkNumberOfUsers, validateOneAdmin]
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
