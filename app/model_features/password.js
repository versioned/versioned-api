const {merge} = require('lib/util')
const passwordHash = require('lib/password_hash')

async function setPasswordHashCallback (doc, options) {
  if (doc.password) {
    return merge(doc, {
      passwordHash: (await passwordHash.generate(doc.password)),
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
      passwordHash: {type: 'string', 'x-meta': {readable: false, writable: false}}
    },
    required: ['passwordHash']
  },
  callbacks: {
    save: {
      beforeValidation: [setPasswordHashCallback]
    }
  }
}

module.exports = model
