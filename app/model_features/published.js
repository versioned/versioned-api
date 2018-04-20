const {rename, empty, isArray, array, groupBy, property, deepMerge, concat, uuid, notEmpty, keys, pick, filter, getIn, merge, compact} = require('lib/util')
const {changes} = require('lib/model_api')
const modelMeta = require('lib/model_meta')
const modelApi = require('lib/model_api')
const config = require('app/config')
const logger = config.logger

const VERSION_TOKEN_LENGTH = 10

function parameters (route) {
  if (['list', 'get'].includes(route.action)) {
    return [
      {
        name: 'published',
        in: 'query',
        required: false,
        schema: {
          type: 'boolean'
        }
      }
    ]
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
        createdAt: {type: 'string', format: 'date-time', 'x-meta': {writable: false, index: -1}},
        createdBy: {type: 'string', 'x-meta': {writable: false, index: 1}}
      }
    },
    features: [],
    indexes: [
      {
        keys: {id: 1, version: 1},
        options: {unique: true}
      },
      {
        keys: {id: 1, versionToken: 1},
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
    return merge(doc, rename(versionDoc, {id: '_id'}))
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
  return merge(pick(doc, versionedProperties(model)), {
    _id: undefined,
    id: doc._id,
    createdAt: new Date(),
    createdBy: (doc.updatedBy || doc.createdBy)
  })
}

function versionQuery (doc) {
  return {id: doc._id, version: doc.version}
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
  if (empty(doc) || !getIn(options, ['queryParams', 'published'])) return doc
  const {model} = options
  const publishedIds = array(doc).filter(d => d.publishedVersion !== d.version).map(d => ({id: d._id, version: d.publishedVersion}))
  if (empty(publishedIds)) return doc
  const publishedQuery = {$or: publishedIds}
  const publishedDocs = groupBy((await modelApi(versionedModel(model), logger).list(publishedQuery)), property('id'))
  const result = array(doc).map(d => {
    return mergeVersion(model, d, publishedDocs[d._id][0])
  })
  return isArray(doc) ? result : result[0]
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
  const {model, existingDoc} = options
  if (doc.version === getIn(existingDoc, ['version'])) {
    const updatedDoc = versionedDoc(model, doc)
    await modelApi(versionedModel(model), logger).update(versionQuery(doc), updatedDoc)
  }
  return doc
}

async function createVersion (doc, options) {
  const {model, existingDoc} = options
  if (!existingDoc || doc.version > existingDoc.version) {
    await modelApi(versionedModel(model), logger).create(versionedDoc(model, doc))
  }
  return doc
}

async function removeVersion (doc, options) {
  await modelApi(versionedModel(options.model), logger).delete(versionQuery(doc))
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

function setPublishAudit (doc, options) {
  if (isPublishing(doc, options)) {
    const now = new Date()
    return merge(doc, compact({
      firstPublishedAt: (doc.firstPublishedAt || now),
      lastPublishedAt: (doc.publishedVersion && now)
    }))
  } else {
    return doc
  }
}

const model = {
  schema: {
    type: 'object',
    properties: {
      version: {type: 'integer', minimum: 1, 'x-meta': {api_writable: false}},
      versionToken: {type: 'string', 'x-meta': {api_writable: false}},
      publishedVersion: {type: 'integer', minimum: 1, 'x-meta': {versioned: false}},
      firstPublishedAt: {type: 'string', format: 'date-time', 'x-meta': {api_writable: false, versioned: false}},
      lastPublishedAt: {type: 'string', format: 'date-time', 'x-meta': {api_writable: false, versioned: false}},
      publishAt: {type: 'string', format: 'date-time', 'x-meta': {versioned: false}},
      unpublishAt: {type: 'string', format: 'date-time', 'x-meta': {versioned: false}}
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
      after: [mergePublishedDocs]
    },
    save: {
      beforeValidation: [setVersion, adjustPublishedVersion, setPublishAudit],
      afterSave: [updateVersion, createVersion]
    },
    delete: {
      after: [removeVersion]
    },
    routeCreate: {
      after: [addRouteParameters]
    }
  }
}

module.exports = model
