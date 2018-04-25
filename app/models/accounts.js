const {concat, merge, property} = require('lib/util')
const {logger, mongo} = require('app/config').modules
const modelApi = require('lib/model_api')

const PLANS = ['shared', 'dedicated']
const DEFAULT_PLAN = 'shared'
const ROLES = ['read', 'write', 'admin']

function setDefaultPlan (doc, options) {
  return merge({plan: DEFAULT_PLAN}, doc)
}

function setDefaultAdmin (doc, options) {
  if (options.user && !(doc.users || []).map(property('id')).includes(options.user._id)) {
    const users = concat(doc.users, [{id: options.user._id.toString(), role: 'admin'}])
    return merge(doc, {users})
  } else {
    return doc
  }
}

function validateOneAdmin (doc, options) {
  if (!(doc.users || []).find(u => u.role === 'admin')) {
    throw modelApi.validationError('Each account must have at least one administrator')
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
            role: {enum: ROLES}
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
    create: {
      beforeValidation: [setDefaultPlan, setDefaultAdmin, validateOneAdmin]
    }
  }
}

module.exports = modelApi(model, mongo, logger)
