const {merge, getIn} = require('lib/util')

function auditCreateCallback (doc, options) {
  return merge(doc, {
    createdAt: new Date(),
    createdBy: getIn(options, ['user', 'id'])
  })
}

function auditUpdateCallback (doc, options) {
  return merge(doc, {
    updatedAt: new Date(),
    updatedBy: getIn(options, ['user', 'id'])
  })
}

const model = {
  schema: {
    type: 'object',
    properties: {
      createdAt: {type: 'string', format: 'date-time', 'x-meta': {writable: false, versioned: false, index: -1}},
      createdBy: {type: 'integer', 'x-meta': {writable: false, versioned: false}},
      updatedAt: {type: 'string', format: 'date-time', 'x-meta': {writable: false, versioned: false}},
      updatedBy: {type: 'integer', 'x-meta': {writable: false, versioned: false}}
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
