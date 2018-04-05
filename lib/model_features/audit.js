const {merge, getIn} = require('lib/util')

function auditCreateCallback (doc, options) {
  return merge(doc, {
    created_at: new Date(),
    created_by: getIn(options, ['user', 'id'])
  })
}

function auditUpdateCallback (doc, options) {
  return merge(doc, {
    updated_at: new Date(),
    updated_by: getIn(options, ['user', 'id'])
  })
}

const model = {
  schema: {
    type: 'object',
    properties: {
      created_at: {type: 'string', format: 'date-time', 'x-meta': {writable: false, versioned: false, index: -1}},
      created_by: {type: 'integer', 'x-meta': {writable: false, versioned: false}},
      updated_at: {type: 'string', format: 'date-time', 'x-meta': {writable: false, versioned: false, change_tracking: false}},
      updated_by: {type: 'integer', 'x-meta': {writable: false, versioned: false, change_tracking: false}}
    },
    required: ['created_at']
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
