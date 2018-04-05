const {getIn, omit} = require('lib/util')
const diff = require('lib/diff')
const changelog = require('app/models/changelog')

function changes (doc, options) {
  if (options.action === 'update') {
    return omit(diff(options.existingDoc, doc), ['updated_at', 'updated_by'])
  } else {
    return undefined
  }
}

async function changelogCallback (doc, options) {
  await changelog.create({
    action: options.action,
    doc,
    changes: changes(doc, options),
    created_by: getIn(options, ['user', 'id']),
    created_at: new Date()
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
