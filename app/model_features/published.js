const {makeObj, difference, rename, empty, isArray, array, groupBy, property, deepMerge, concat, uuid, notEmpty, keys, pick, filter, getIn, merge, compact} = require('lib/util')
const {changes} = require('lib/model_api')
const modelMeta = require('lib/model_meta')
const modelApi = require('lib/model_api')
const config = require('app/config')
const {logger} = config.modules
const {readableDoc} = require('lib/model_access')
const {sortedCallback} = require('lib/model_callbacks_helper')
const {missingError, validationError} = require('lib/errors')

const VERSION_TOKEN_LENGTH = 10

const PARAMS = {
  published: {
    name: 'published',
    in: 'query',
    description: 'Set to 1 (true) to only return published content',
    required: false,
    schema: {
      type: 'boolean'
    }
  },
  versionToken: {
    name: 'versionToken',
    in: 'query',
    description: 'Use to fetch a specific version. Can be used for preview by clients or for revert in admin UI',
    required: false,
    schema: {
      type: 'string'
    }
  },
  versions: {
    name: 'versions',
    in: 'query',
    description: 'Set to 1 (true) to return version history of the document',
    required: false,
    schema: {
      type: 'boolean'
    }
  }
}

function parameters (route) {
  if (route.action === 'list') {
    return [PARAMS.published]
  } else if (route.action === 'get') {
    return [PARAMS.published, PARAMS.versionToken, PARAMS.versions]
  } else {
    return []
  }
}

function addRouteParameters (route) {
  return merge(route, {
    parameters: concat(route.parameters, parameters(route))
  })
}

function versionedModel (model) {
  return {
    coll: `${model.coll}_versions`,
    schema: {
      type: 'object',
      properties: {
        docId: {type: 'string'},
        createdAt: {type: 'string', format: 'date-time', 'x-meta': {writable: false, index: -1}},
        createdBy: {type: 'object', 'x-meta': {writable: false}}
      }
    },
    features: [],
    indexes: [
      {
        keys: {'createdBy.id': 1}
      },
      {
        keys: {docId: 1, version: 1},
        options: {unique: true}
      },
      {
        keys: {docId: 1, versionToken: 1},
        options: {unique: true}
      }
    ]
  }
}

function isVersionedProperty (property) {
  return getIn(property, ['x-meta', 'versioned']) !== false
}

function versionedProperties (model) {
  return keys(filter(modelMeta.properties(model), isVersionedProperty))
}

function mergeVersion (model, doc, versionDoc) {
  if (doc.version !== versionDoc.version) {
    return merge(doc, rename(versionDoc, {docId: 'id'}))
  } else {
    return doc
  }
}

function versionedChanges (model, existingDoc, doc) {
  return pick(changes(existingDoc, doc), versionedProperties(model))
}

function shouldIncrementVersion (model, existingDoc, doc) {
  const shouldIncrement = notEmpty(versionedChanges(model, existingDoc, doc)) &&
    getIn(existingDoc, ['publishedVersion']) && existingDoc.publishedVersion >= existingDoc.version
  logger.verbose('published: shouldIncrementVersion and versionedChanges', shouldIncrement, versionedChanges(model, existingDoc, doc))
  return shouldIncrement
}

function newVersion (model, existingDoc, doc) {
  if (getIn(existingDoc, ['version'])) {
    return shouldIncrementVersion(model, existingDoc, doc) ? (existingDoc.version + 1) : existingDoc.version
  } else {
    return 1
  }
}

function newVersionToken (model, existingDoc, doc) {
  if (!doc.versionToken || shouldIncrementVersion(model, existingDoc, doc)) {
    return uuid(VERSION_TOKEN_LENGTH)
  } else {
    return doc.versionToken
  }
}

function versionedDoc (model, doc) {
  return rename(
    pick(doc, versionedProperties(model)),
    {id: 'docId'})
}

function versionQuery (doc) {
  return {docId: doc.id, version: doc.version}
}

// ///////////////////////////////////////
// CALLBACKS
// ///////////////////////////////////////

function addPublishedQuery (doc, options) {
  if (getIn(options, ['queryParams', 'published'])) {
    return deepMerge(doc, {
      query: {
        publishedVersion: {$ne: null}
      }
    })
  } else {
    return doc
  }
}

async function mergePublishedDocs (doc, options) {
  if (empty(doc) || !getIn(options, ['queryParams', 'published']) || getIn(options, ['queryParams', 'versionToken'])) return
  const {model, api} = options
  const publishedIds = array(doc).filter(d => d.publishedVersion !== d.version).map(d => ({docId: d.id, version: d.publishedVersion}))
  if (empty(publishedIds)) return doc
  const publishedQuery = {$or: publishedIds}
  const publishedDocs = groupBy((await modelApi(versionedModel(model), api.mongo, logger).list(publishedQuery)), property('docId'))
  const result = array(doc).map(d => {
    return d.publishedVersion !== d.version ? mergeVersion(model, d, publishedDocs[d.id][0]) : d
  })
  return isArray(doc) ? result : result[0]
}

async function findAndMergeVersionByToken (doc, options) {
  const versionToken = getIn(options, ['queryParams', 'versionToken'])
  if (empty(doc) || !versionToken || versionToken === doc.versionToken) return
  const {model, api} = options
  const query = {versionToken}
  const versionDoc = await modelApi(versionedModel(model), api.mongo, logger).get(query)
  if (!versionDoc) {
    throw missingError(versionedModel(model), query)
  }
  return mergeVersion(model, doc, versionDoc)
}

async function findVersions (doc, options) {
  const {model, api} = options
  if (!doc || !getIn(options, ['queryParams', 'versions'])) return doc
  const query = {docId: doc.id}
  const sort = '-version'
  const docs = await modelApi(versionedModel(model), api.mongo, logger).list(query, {sort})
  const versions = docs.map(d => readableDoc(model, rename(d, {docId: 'id'})))
  return deepMerge(doc, {sys: {versions}})
}

function setVersion (doc, options) {
  const version = newVersion(options.model, options.existingDoc, doc)
  const versionToken = newVersionToken(options.model, options.existingDoc, doc)
  return merge(doc, {
    version,
    versionToken
  })
}

async function updateVersion (doc, options) {
  const {model, api, existingDoc} = options
  if (doc.version === getIn(existingDoc, ['version']) && notEmpty(versionedChanges(model, existingDoc, doc))) {
    const removedFields = makeObj(difference(keys(existingDoc), keys(doc)), () => null)
    const updatedDoc = [versionedDoc(model, doc), pick(doc, ['updatedAt', 'updatedBy']), removedFields].reduce(merge)
    await modelApi(versionedModel(model), api.mongo, logger).update(versionQuery(doc), updatedDoc)
  }
  return doc
}

async function createVersion (doc, options) {
  const {api, model, existingDoc} = options
  if (!existingDoc || doc.version > existingDoc.version) {
    const createDoc = merge(versionedDoc(model, doc), pick(doc, ['createdAt', 'createdBy']))
    await modelApi(versionedModel(model), api.mongo, logger).create(createDoc)
  }
  return doc
}

function checkNotPublished (doc, options) {
  if (doc.publishedVersion) {
    throw validationError(options.model, doc, 'Please unpublish before you delete')
  }
}

async function removeVersion (doc, options) {
  const {api} = options
  await modelApi(versionedModel(options.model), api.mongo, logger).delete(versionQuery(doc))
  return doc
}

function adjustPublishedVersion (doc, options) {
  if (doc.publishedVersion) {
    return merge(doc, {publishedVersion: Math.min(doc.publishedVersion, doc.version)})
  } else {
    return doc
  }
}

function isPublishing (doc, options) {
  if (options.action === 'create') {
    return doc.publishedVersion
  } else if (options.action === 'update') {
    return doc.publishedVersion && getIn(changes(options.existingDoc, doc), ['publishedVersion'])
  } else {
    return false
  }
}

function isUnpublishing (doc, options) {
  if (options.action === 'update') {
    return !doc.publishedVersion && getIn(changes(options.existingDoc, doc), ['publishedVersion'])
  } else {
    return false
  }
}

function setPublishAudit (doc, options) {
  const now = new Date()
  if (isPublishing(doc, options)) {
    return merge(doc, compact({
      firstPublishedAt: (doc.firstPublishedAt || now),
      lastPublishedAt: now
    }))
  } else if (isUnpublishing(doc, options)) {
    return merge(doc, compact({
      firstUnpublishedAt: (doc.firstUnpublishedAt || now),
      lastUnpublishedAt: now
    }))
  } else {
    return doc
  }
}

const model = {
  schema: {
    type: 'object',
    properties: {
      version: {type: 'integer', minimum: 1, 'x-meta': {writable: false}},
      versionToken: {type: 'string', 'x-meta': {writable: false}},
      publishedVersion: {type: 'integer', minimum: 1, 'x-meta': {versioned: false, mergeChangelog: false}},
      firstPublishedAt: {type: 'string', format: 'date-time', 'x-meta': {writable: false, versioned: false}},
      lastPublishedAt: {type: 'string', format: 'date-time', 'x-meta': {writable: false, versioned: false}},
      firstUnpublishedAt: {type: 'string', format: 'date-time', 'x-meta': {writable: false, versioned: false}},
      lastUnpublishedAt: {type: 'string', format: 'date-time', 'x-meta': {writable: false, versioned: false}},
      publishAt: {type: 'string', format: 'date-time', 'x-meta': {versioned: false}},
      unpublishAt: {type: 'string', format: 'date-time', 'x-meta': {versioned: false}},
      versions: {type: 'array', items: {type: 'object'}, 'x-meta': {writable: false, versioned: false, readable: true}}
    },
    required: ['version', 'versionToken']
  },
  callbacks: {
    list: {
      before: [addPublishedQuery],
      after: [mergePublishedDocs]
    },
    get: {
      before: [addPublishedQuery],
      after: [mergePublishedDocs, findAndMergeVersionByToken, findVersions]
    },
    save: {
      // NOTE: sorting setVersion et al callbacks last as especially setVersion needs to make decisions based on if
      // anything has changed.
      beforeValidation: [setVersion, adjustPublishedVersion, setPublishAudit].map(c => sortedCallback('last', c)),
      afterSave: [updateVersion, createVersion]
    },
    delete: {
      before: [checkNotPublished],
      after: [removeVersion]
    },
    routeCreate: {
      after: [addRouteParameters]
    }
  }
}

module.exports = model
