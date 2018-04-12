const {getIn} = require('lib/util')
const changelog = require('app/models/changelog')
const {changes} = require('lib/model_api')

async function changelogCallback (doc, options) {
  await changelog.create({
    action: options.action,
    doc,
    changes: changes(options.existingDoc, doc),
    createdBy: getIn(options, ['user', 'id']),
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
      after_delete: [changelogCallback]
    }
  }
}

module.exports = model
