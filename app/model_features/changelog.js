const changelog = require('app/models/changelog')
const {changes} = require('lib/model_api')
const {readableDoc} = require('lib/model_access')
const modelMeta = require('lib/model_meta')

async function changelogCallback (doc, options) {
  const users = require('app/models/users')
  await changelog.create({
    action: options.action,
    doc: readableDoc(options.model, doc),
    changes: changes(options.existingDoc, doc),
    createdBy: modelMeta.getId(users.model, options.user),
    createdAt: new Date()
  }, options)
  return doc
}

const model = {
  callbacks: {
    save: {
      after_save: [changelogCallback]
    },
    delete: {
      after: [changelogCallback]
    }
  }
}

module.exports = model
