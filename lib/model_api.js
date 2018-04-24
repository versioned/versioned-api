const {isObject, keys, getIn, concat, empty, json, merge, compact, omit} = require('lib/util')
const diff = require('lib/diff')
const jsonSchema = require('lib/json_schema')
const modelSpec = require('lib/model_spec')
const modelMeta = require('lib/model_meta')
const {SILENT_LOGGER} = require('lib/logger')

const LIST_LIMIT = 100

function validationError (message, field) {
  return {status: 422, errors: [{field, type: 'validation', message}]}
}

function missingError (queryOrId) {
  return {
    status: 404,
    errors: [{type: 'missing', message: `Could not find find document with queryOrId=${json(queryOrId)}`}]
  }
}

const unchangedError = {
  status: 204,
  errors: [{type: 'unchanged', message: `No changes made to document`}]
}

function changes (existingDoc, doc) {
  if (existingDoc) {
    return omit(diff(existingDoc, doc), ['updatedAt', 'updatedBy'])
  } else {
    return undefined
  }
}

function modelIndexes (model) {
  const propertyIndexes = compact(keys(model.schema.properties).map(property => {
    const {index, unique} = getIn(model, ['schema', 'properties', property, 'x-meta'], {})
    if (index || unique) {
      const sortOrder = (index === true || index === 1) ? 1 : -1
      const keys = {[property]: sortOrder}
      const options = {unique}
      return {keys, options}
    }
  }))
  return concat(model.indexes, propertyIndexes)
}

function modelApi (model, mongo, logger = SILENT_LOGGER) {
  const modelCallbacks = require('lib/model_callbacks')(logger)
  const {db, collStats, formatDbError, createIndexes, isMongoId, createId} = mongo
  model = modelSpec.generate(model)
  const idProperty = modelMeta.idProperty(model)

  function idQuery (id) {
    if (isMongoId(id)) {
      return {_id: createId(id)}
    } else {
      return {[idProperty]: id}
    }
  }

  function defaultSort () {
    if (modelMeta.hasProperty(model, 'createdAt')) {
      return [['createdAt', -1]]
    } else {
      return undefined
    }
  }

  function parseSort (sort) {
    if (!sort) return undefined
    return sort.split(',').map(item => {
      const direction = item.startsWith('-') ? -1 : 1
      const property = item.replace(/^-/, '')
      return [property, direction]
    })
  }

  // See: http://mongodb.github.io/node-mongodb-native/3.0/api/Collection.html#find
  async function list (query = {}, options = {}) {
    const sort = parseSort(options.sort) || defaultSort()
    const limit = options.limit || LIST_LIMIT
    const skip = options.skip || 0
    const findOptions = {sort, limit, skip}
    let findArgs = await modelCallbacks(api, {query, findOptions}, 'before', 'list', options)
    logger.debug(`model_api: ${model.coll}.list query=${json(findArgs.query)} findOptions=${json(findArgs.findOptions)}`)
    let data = await db().collection(model.coll).find(findArgs.query, findArgs.findOptions).toArray()
    data = await modelCallbacks(api, data, 'after', 'list', options)
    if (options.count) {
      return {data, limit, skip, count: (await count(findArgs.query))}
    } else {
      return data
    }
  }

  async function get (id, options = {}) {
    let findArgs = await modelCallbacks(api, {query: idQuery(id), id}, 'before', 'get', options)
    logger.debug(`model_api: ${model.coll}.get query=${json(findArgs.query)}`)
    let result = await db().collection(model.coll).findOne(findArgs.query)
    result = await modelCallbacks(api, result, 'after', 'get', options)
    return result
  }

  async function findOne (queryOrId) {
    const query = isObject(queryOrId) ? queryOrId : idQuery(queryOrId)
    return db().collection(model.coll).findOne(query)
  }

  async function create (doc, options = {}) {
    let dbDoc = compact(await modelCallbacks(api, doc, 'beforeValidation', 'create', options))
    const errors = jsonSchema.validate(model.schema, dbDoc)
    logger.debug(`model_api: ${model.coll}.create doc=${json(doc)} dbDoc=${json(dbDoc)} user=${json(options.user)} errors=${json(errors)}`)
    if (errors) return Promise.reject(errors)
    dbDoc = compact(await modelCallbacks(api, dbDoc, 'afterValidation', 'create', options))
    await createIndexes(model.coll, modelIndexes(model))
    return db().collection(model.coll).insert(dbDoc)
      .then(result => {
        const resultDoc = result.ops[0]
        return modelCallbacks(api, resultDoc, 'afterSave', 'create', options)
      })
      .catch(dbError => {
        logger.debug(`model_api: ${model.coll}.create dbError dbError=${json(dbError)}`)
        throw formatDbError(dbError)
      })
  }

  async function update (queryOrId, doc, options = {}) {
    const existingDoc = await findOne(queryOrId)
    if (!existingDoc) throw missingError(queryOrId)
    let updatedDoc = compact(merge(existingDoc, doc))
    const callbackOptions = merge(options, {existingDoc})
    updatedDoc = compact(await modelCallbacks(api, updatedDoc, 'beforeValidation', 'update', callbackOptions))
    const errors = jsonSchema.validate(model.schema, updatedDoc)
    if (errors) {
      logger.debug(`model_api: ${model.coll}.update queryOrId=${json(queryOrId)} doc=${json(doc)} existingDoc=${json(existingDoc)} updatedDoc=${json(updatedDoc)} changes=${json(changes(existingDoc, updatedDoc))} errors=${json(errors)}`)
      return Promise.reject(errors)
    }
    updatedDoc = compact(await modelCallbacks(api, updatedDoc, 'afterValidation', 'update', callbackOptions))
    if (empty(changes(existingDoc, updatedDoc))) return Promise.reject(unchangedError)
    const query = isObject(queryOrId) ? queryOrId : idQuery(queryOrId)
    logger.debug(`model_api: ${model.coll}.update queryOrId=${json(queryOrId)} doc=${json(doc)} changes=${json(changes(existingDoc, updatedDoc))} updatedDoc=${json(updatedDoc)} query=${json(query)}`)
    await createIndexes(model.coll, modelIndexes(model))
    return db().collection(model.coll).update(query, updatedDoc)
      .then((result) => {
        return modelCallbacks(api, updatedDoc, 'afterSave', 'update', callbackOptions)
      })
      .catch(dbError => {
        logger.debug(`model_api: ${model.coll}.update dbError dbError=${json(dbError)}`)
        throw formatDbError(dbError)
      })
  }

  async function _delete (queryOrId, options = {}) {
    logger.debug(`model_api: ${model.coll}.delete queryOrId=${json(queryOrId)}`)
    const doc = await findOne(queryOrId)
    if (!doc) throw missingError(queryOrId)
    await modelCallbacks(api, doc, 'before', 'delete', options)
    await createIndexes(model.coll, modelIndexes(model))
    const query = isObject(queryOrId) ? queryOrId : idQuery(queryOrId)
    return db().collection(model.coll).remove(query)
      .then(() => {
        return modelCallbacks(api, doc, 'after', 'delete', options)
      })
      .catch(dbError => {
        logger.debug(`model_api: ${model.coll}.delete dbError dbError=${json(dbError)}`)
        throw formatDbError(dbError)
      })
  }

  async function count (query = {}) {
    return db().collection(model.coll).count(query)
  }

  async function dbStats (options = {}) {
    return collStats(model.coll, options)
  }

  const api = {
    model,
    mongo,
    idProperty,
    idQuery,
    list,
    get,
    findOne,
    create,
    update,
    delete: _delete,
    count,
    dbStats
  }
  return api
}

module.exports = Object.assign(modelApi, {
  changes,
  validationError
})
