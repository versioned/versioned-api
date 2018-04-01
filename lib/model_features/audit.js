const {merge, getIn} = require('lib/util')

function auditCreateCallback (doc, options) {
  return merge(doc, {
    created_at: new Date(),
    created_by: getIn(options, ['user', 'email'])
  })
}

function auditUpdateCallback (doc, options) {
  return merge(doc, {
    updated_at: new Date(),
    updated_by: getIn(options, 'user', 'email')
  })
}

const model = {
  schema: {
    type: 'object',
    properties: {
      created_at: {type: 'string', format: 'date-time', 'x-meta': {api_writable: false, versioned: false, index: -1}},
      created_by: {type: 'string', 'x-meta': {api_writable: false, versioned: false}},
      updated_at: {type: 'string', format: 'date-time', 'x-meta': {api_writable: false, versioned: false, change_tracking: false}},
      updated_by: {type: 'string', 'x-meta': {api_writable: false, versioned: false, change_tracking: false}}
    },
    required: ['created_at']
  },
  callbacks: {
    create: {
      before: [auditCreateCallback]
    },
    update: {
      before: [auditUpdateCallback]
    }
  }
}

module.exports = model
