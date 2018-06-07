const search = require('lib/search')
const config = require('app/config')

async function saveSearchDoc (doc, options) {
  await search(config, options).save(options.model, doc)
}

async function deleteSearchDoc (doc, options) {
  await search(config, options).delete(options.model, doc)
}

const model = {
  callbacks: {
    save: {
      afterSave: [saveSearchDoc]
    },
    delete: {
      after: [deleteSearchDoc]
    }
  }
}

module.exports = model
