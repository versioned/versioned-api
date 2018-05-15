const {urlFriendly, notEmpty, empty, toString, find, getIn, concat, merge, property} = require('lib/util')
const {logger, mongo} = require('app/config').modules
const modelApi = require('lib/model_api')
const users = require('app/models/users')
const {validationError, accessError} = require('lib/errors')
const requireSpaces = () => require('app/models/spaces')

const PLANS = ['shared', 'dedicated']
const DEFAULT_PLAN = 'shared'

const keySchema = {
  type: 'string',
  pattern: `^[a-z0-9-]*$`,
  minLength: 1,
  maxLength: 40,
  'x-meta': {unique: true}
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

function setDefaultKey (doc, options) {
  if (empty(doc.key) && notEmpty(doc.name)) {
    const key = urlFriendly(doc.name).substring(0, keySchema.maxLength)
    return merge(doc, {key})
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
    throw validationError(options.model, doc, 'Each account must have at least one administrator')
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
      name: {type: 'string'},
      key: keySchema,
      plan: {enum: PLANS},
      spaces: {
        type: 'array',
        items: {type: 'string'},
        'x-meta': {
          writable: false,
          relationship: {
            toType: 'spaces',
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
            toType: 'users',
            toField: 'accounts',
            type: 'many-to-many'
          }
        }
      }
    },
    required: ['name', 'plan', 'users'],
    additionalProperties: false
  },
  callbacks: {
    create: {
      beforeValidation: [setDefaultKey, setDefaultPlan, setDefaultAdmin, validateOneAdmin],
      afterSave: [createDefaultSpace]
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
