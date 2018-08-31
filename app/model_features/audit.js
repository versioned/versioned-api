const {pick, merge} = require('lib/util')

function auditUser (user) {
  return pick(user, ['id', 'name', 'email'])
}

function auditCreateCallback (doc, options) {
  const now = new Date()
  const user = auditUser(options.user)
  const auditFields = {
    createdAt: now,
    createdBy: user,
    updatedAt: now,
    updatedBy: user
  }
  if (options.import) {
    // During import we allow overwrite of creation times etc.
    return merge(auditFields, doc)
  } else {
    return merge(doc, auditFields)
  }
}

function auditUpdateCallback (doc, options) {
  return merge(doc, {
    updatedAt: new Date(),
    updatedBy: auditUser(options.user)
  })
}

const model = {
  schema: {
    type: 'object',
    properties: {
      createdAt: {type: 'string', format: 'date-time', 'x-meta': {writable: false, versioned: false, index: -1}},
      createdBy: {
        type: 'object',
        'x-meta': {
          writable: false,
          versioned: false,
          relationship: {
            toType: 'users',
            type: 'many-to-one'
          }
        }
      },
      updatedAt: {type: 'string', format: 'date-time', 'x-meta': {writable: false, versioned: false, index: -1}},
      updatedBy: {
        type: 'object',
        'x-meta': {
          writable: false,
          versioned: false,
          relationship: {
            toType: 'users',
            type: 'many-to-one'
          }
        }
      }
    },
    required: ['createdAt']
  },
  callbacks: {
    create: {
      beforeValidation: [auditCreateCallback]
    },
    update: {
      beforeValidation: [auditUpdateCallback]
    }
  },
  indexes: [
    {
      keys: {'createdBy.id': 1}
    },
    {
      keys: {'updatedBy.id': 1}
    }
  ]
}

module.exports = model
