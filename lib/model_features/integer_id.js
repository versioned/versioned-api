// See: https://docs.mongodb.com/v3.0/tutorial/create-an-auto-incrementing-field/

const {merge} = require('lib/util')
const {nextSequence} = require('lib/mongo')

function setIdCallback (doc, options) {
  if (!doc.id) {
    const id = nextSequence(doc.coll)
    return merge(doc, {id})
  } else {
    return doc
  }
}

const model = {
  schema: {
    type: 'object',
    properties: {
      _id: {type: 'string', pattern: '^[a-z0-9]{24}$', 'x-meta': {api_writable: false}},
      id: {type: 'integer', 'x-meta': {api_writable: false, unique: true}}
    },
    required: ['id']
  },
  callbacks: {
    create: {
      before: [setIdCallback]
    }
  }
}

module.exports = model
