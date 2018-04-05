const {merge} = require('lib/util')
const passwordHash = require('lib/password_hash')

async function setPasswordHashCallback (doc, options) {
  if (doc.password) {
    return merge(doc, {
      password_hash: (await passwordHash.generate(doc.password)),
      password: undefined
    })
  } else {
    return doc
  }
}

const model = {
  schema: {
    type: 'object',
    properties: {
      password: {type: 'string', minLength: 4, maxLength: 100, 'x-meta': {readable: false}},
      password_hash: {type: 'string', 'x-meta': {readable: false, writable: false}}
    },
    required: ['password_hash']
  },
  callbacks: {
    save: {
      before_validation: [setPasswordHashCallback]
    }
  }
}

module.exports = model
