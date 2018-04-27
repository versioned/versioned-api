const {getIn, toString} = require('lib/util')
const config = require('app/config')
const {logger} = config.modules
const changelog = require('app/models/changelog')
const modelApi = require('lib/model_api')
const {readableDoc} = require('lib/model_access')
const modelMeta = require('lib/model_meta')

async function changelogCallback (doc, options) {
  const accountId = toString(getIn(options, 'account._id'))
  const spaceId = toString(getIn(options, 'space._id'))
  const coll = getIn(options, 'model.coll')
  const users = require('app/models/users')
  const existingDoc = readableDoc(options.model, options.existingDoc)
  const toDoc = readableDoc(options.model, doc)
  const changes = modelApi.changes(existingDoc, toDoc)
  const api = modelApi(changelog.model, options.api.mongo, logger)
  await api.create({
    accountId,
    spaceId,
    coll,
    action: options.action,
    existingDoc,
    doc: toDoc,
    changes,
    createdBy: modelMeta.getId(users.model, options.user),
    createdAt: new Date()
  }, options)
  return doc
}

const model = {
  callbacks: {
    save: {
      afterSave: [changelogCallback]
    },
    delete: {
      after: [changelogCallback]
    }
  }
}

module.exports = model
