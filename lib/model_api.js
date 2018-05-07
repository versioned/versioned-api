const {isArray, rename, pick, evolveAll, isObject, keys, getIn, concat, empty, json, merge, compact, omit} = require('lib/util')
const diff = require('lib/diff')
const jsonSchema = require('lib/json_schema')
const modelSpec = require('lib/model_spec')
const modelMeta = require('lib/model_meta')
const {SILENT_LOGGER} = require('lib/logger')
const {dbResultError, missingError, unchangedError} = require('lib/errors')

const LIST_LIMIT = 100

function changes (existingDoc, doc) {
  if (existingDoc) {
    return omit(diff(existingDoc, doc), ['updatedAt', 'updatedBy', 'type'])
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
  const {db, collStats, formatDbError, createIndexes} = mongo
  if (!model.generated) model = modelSpec.generate(model)
  const idProperty = modelMeta.idProperty(model)

  function idQuery (id) {
    return {[idProperty]: id}
  }

  function makeQuery (queryOrId) {
    if (isObject(queryOrId)) {
      return rename(queryOrId, {id: '_id'}, {overwrite: false})
    } else {
      return idQuery(queryOrId)
    }
  }

  function renameId (data) {
    if (!data) return data
    const renameDoc = (doc) => rename(doc, {_id: 'id'})
    return isArray(data) ? data.map(renameDoc) : renameDoc(data)
  }

  function toMongoDoc (doc) {
    return rename(doc, {id: '_id'})
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

  function assertScoped (doc, query, options) {
    if (options.scope) {
      const expected = options.scope
      const actual = pick(doc, keys(expected))
      if (diff(actual, expected)) {
        logger.debug(`model_api assertScoped diff doc=${json(doc)} actual=${json(actual)} expected=${json(expected)}`)
        const scopedQuery = merge(query, expected)
        throw missingError(scopedQuery)
      }
    }
  }

  // See: http://mongodb.github.io/node-mongodb-native/3.0/api/Collection.html#find
  async function list (query = {}, options = {}) {
    const sort = parseSort(options.sort) || defaultSort()
    const limit = options.limit || LIST_LIMIT
    const skip = options.skip || 0
    const findOptions = {sort, limit, skip}
    let findArgs = await modelCallbacks(api, {query, findOptions}, 'before', 'list', options)
    logger.debug(`model_api: ${model.coll}.list query=${json(findArgs.query)} findOptions=${json(findArgs.findOptions)}`)
    let data = renameId(await db().collection(model.coll).find(toMongoDoc(findArgs.query), findArgs.findOptions).toArray())
    data = await modelCallbacks(api, data, 'after', 'list', options)
    if (options.count) {
      return {data, limit, skip, count: (await count(findArgs.query))}
    } else {
      return data
    }
  }

  async function get (queryOrId, options = {}) {
    const query = makeQuery(queryOrId)
    let findArgs = await modelCallbacks(api, {query}, 'before', 'get', options)
    logger.debug(`model_api: ${model.coll}.get query=${json(findArgs.query)}`)
    let result = renameId(await db().collection(model.coll).findOne(toMongoDoc(findArgs.query)))
    assertScoped(result, query, options)
    result = await modelCallbacks(api, result, 'after', 'get', options)
    return result
  }

  async function findOne (queryOrId, options = {}) {
    const query = makeQuery(queryOrId)
    const result = renameId(await db().collection(model.coll).findOne(toMongoDoc(query)))
    assertScoped(result, query, options)
    return result
  }

  async function create (doc, options = {}) {
    doc = merge({id: mongo.createId()}, doc)
    let dbDoc = compact(await modelCallbacks(api, doc, 'beforeValidation', 'create', options))
    const errors = jsonSchema.validate(model.schema, dbDoc)
    logger.debug(`model_api: ${model.coll}.create doc=${json(doc)} dbDoc=${json(dbDoc)} user=${json(options.user)} errors=${json(errors)}`)
    if (errors) return Promise.reject(errors)
    dbDoc = compact(await modelCallbacks(api, dbDoc, 'afterValidation', 'create', options))
    await createIndexes(model.coll, modelIndexes(model))
    return db().collection(model.coll).insert(toMongoDoc(dbDoc))
      .then(result => {
        if (result.result.ok !== 1) return Promise.reject(dbResultError(model, dbDoc, result.result, 'database create failed'))
        const resultDoc = renameId(result.ops[0])
        return modelCallbacks(api, resultDoc, 'afterSave', 'create', options)
      })
      .catch(error => {
        logger.debug(`model_api: ${model.coll}.create error=${json(error)}`, error)
        throw formatDbError(error)
      })
  }

  async function update (queryOrId, doc, options = {}) {
    logger.debug(`model_api: ${model.coll}.update queryOrId=${json(queryOrId)} doc=${json(doc)}`)
    const existingDoc = await findOne(queryOrId, options)
    if (!existingDoc) throw missingError(queryOrId)
    let updatedDoc = compact(merge(existingDoc, doc))
    if (options.evolve) updatedDoc = evolveAll(updatedDoc, options.evolve)
    const callbackOptions = merge(options, {existingDoc})
    if (options.callbacks !== false) {
      updatedDoc = compact(await modelCallbacks(api, updatedDoc, 'beforeValidation', 'update', callbackOptions))
    }
    const errors = jsonSchema.validate(model.schema, updatedDoc)
    if (errors) {
      logger.debug(`model_api: ${model.coll}.update queryOrId=${json(queryOrId)} doc=${json(doc)} existingDoc=${json(existingDoc)} updatedDoc=${json(updatedDoc)} changes=${json(changes(existingDoc, updatedDoc))} errors=${json(errors)}`)
      return Promise.reject(errors)
    }
    updatedDoc = compact(await modelCallbacks(api, updatedDoc, 'afterValidation', 'update', callbackOptions))
    if (empty(changes(existingDoc, updatedDoc))) {
      return options.rejectUnchanged === false ? Promise.resolve(updatedDoc) : Promise.reject(unchangedError(model, existingDoc, updatedDoc))
    }
    const query = makeQuery(queryOrId)
    logger.debug(`model_api: ${model.coll}.update queryOrId=${json(queryOrId)} doc=${json(doc)} existingDoc=${json(existingDoc)} updatedDoc=${json(updatedDoc)} changes=${json(changes(existingDoc, updatedDoc))} query=${json(query)} mongoQuery=${json(toMongoDoc(query))}`)
    await createIndexes(model.coll, modelIndexes(model))
    return db().collection(model.coll).update(toMongoDoc(query), toMongoDoc(updatedDoc))
      .then((result) => {
        const resultDoc = renameId(updatedDoc)
        if (result.result.nModified === 0) return Promise.reject(dbResultError(model, resultDoc, result.result, 'database update failed'))
        if (options.callbacks === false) {
          return Promise.resolve(resultDoc)
        } else {
          return modelCallbacks(api, resultDoc, 'afterSave', 'update', callbackOptions)
        }
      })
      .catch(error => {
        logger.debug(`model_api: ${model.coll}.update error=${json(error)}`, error)
        throw formatDbError(error)
      })
  }

  async function _delete (queryOrId, options = {}) {
    logger.debug(`model_api: ${model.coll}.delete queryOrId=${json(queryOrId)}`)
    const doc = await findOne(queryOrId, options)
    if (!doc) throw missingError(queryOrId)
    await modelCallbacks(api, doc, 'before', 'delete', options)
    await createIndexes(model.coll, modelIndexes(model))
    const query = makeQuery(queryOrId)
    return db().collection(model.coll).remove(toMongoDoc(query))
      .then((result) => {
        const resultDoc = renameId(doc)
        if (result.result.ok !== 1) return Promise.reject(dbResultError(model, resultDoc, result.result, 'database delete failed'))
        return modelCallbacks(api, resultDoc, 'after', 'delete', options)
      })
      .catch(error => {
        logger.debug(`model_api: ${model.coll}.delete error=${json(error)}`, error)
        throw formatDbError(error)
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
  changes
})
