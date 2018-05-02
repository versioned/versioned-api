const {filter, keys, empty, intersection, first, getIn, toString} = require('lib/util')
const {elapsedSeconds} = require('lib/date_util')
const config = require('app/config')
const {logger} = config.modules
const changelog = require('app/models/changelog')
const modelApi = require('lib/model_api')
const {readableDoc} = require('lib/model_access')
const modelMeta = require('lib/model_meta')
const diff = require('lib/diff')

const RECENT_SECONDS = 3600

function getUserId (options) {
  const users = require('app/models/users')
  return modelMeta.getId(users.model, options.user)
}

function getColl (options) {
  return getIn(options, 'model.coll')
}

function mergableChanges (changes, options) {
  const unmergable = (property) => getIn(property, 'x-meta.mergeChangelog') === false
  const unmergableProperties = keys(filter(getIn(options, 'model.schema.properties'), unmergable))
  return empty(intersection(unmergableProperties, keys(changes)))
}

async function getMergableUpdate (api, doc, changes, options) {
  if (options.action !== 'update' || !mergableChanges(changes, options)) return undefined
  const query = {
    action: options.action,
    coll: getColl(options),
    'doc.id': doc.id
  }
  const listOptions = {limit: 1}
  const lastUpdate = first(await api.list(query, listOptions))
  const userId = getUserId(options)
  if (lastUpdate &&
    mergableChanges(lastUpdate.changes, options) &&
    toString(lastUpdate.createdBy) === toString(userId) &&
    elapsedSeconds(lastUpdate.createdAt) < RECENT_SECONDS) {
    return lastUpdate
  } else {
    return undefined
  }
}

async function changelogCallback (doc, options) {
  const {user, action} = options
  const accountId = toString(getIn(options, 'account.id'))
  const spaceId = toString(getIn(options, 'space.id'))
  const existingDoc = readableDoc(options.model, options.existingDoc)
  const toDoc = readableDoc(options.model, doc)
  const changes = modelApi.changes(existingDoc, toDoc)
  const api = modelApi(changelog.model, options.api.mongo, logger)
  const mergableUpdate = await getMergableUpdate(api, doc, changes, options)
  if (mergableUpdate && diff(mergableUpdate.doc, toDoc)) {
    await api.update(mergableUpdate.id, {
      doc: toDoc,
      changes: modelApi.changes(mergableUpdate.existingDoc, toDoc),
      createdAt: new Date()
    }, {user})
  } else {
    await api.create({
      accountId,
      spaceId,
      coll: getColl(options),
      action,
      existingDoc,
      doc: toDoc,
      changes,
      createdBy: getUserId(options),
      createdAt: new Date()
    }, {user})
  }
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
