const {merge} = require('lib/util')
const modelMeta = require('lib/model_meta')

function auditCreateCallback (doc, options) {
  const users = require('app/models/users')
  console.log('pm debug audit callback', users.model, modelMeta.idProperty(users.model), options.user, modelMeta.getId(users.model, options.user))
  return merge(doc, {
    createdAt: new Date(),
    createdBy: modelMeta.getId(users.model, options.user)
  })
}

function auditUpdateCallback (doc, options) {
  const users = require('app/models/users')
  return merge(doc, {
    updatedAt: new Date(),
    updatedBy: modelMeta.getId(users.model, options.user)
  })
}

const model = {
  schema: {
    type: 'object',
    properties: {
      createdAt: {type: 'string', format: 'date-time', 'x-meta': {writable: false, versioned: false, index: -1}},
      createdBy: {type: 'string', 'x-meta': {writable: false, versioned: false, index: 1}},
      updatedAt: {type: 'string', format: 'date-time', 'x-meta': {writable: false, versioned: false, index: -1}},
      updatedBy: {type: 'string', 'x-meta': {writable: false, versioned: false, index: 1}}
    },
    required: ['createdAt']
  },
  callbacks: {
    create: {
      before_validation: [auditCreateCallback]
    },
    update: {
      before_validation: [auditUpdateCallback]
    }
  }
}

module.exports = model
