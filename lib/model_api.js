const {filter, isArray, rename, pick, evolveAll, isObject, keys, getIn, concat, empty, json, merge, compact} = require('lib/util')
const diff = require('lib/diff')
const jsonSchema = require('lib/json_schema')
const modelSpec = require('lib/model_spec')
const modelMeta = require('lib/model_meta')
const {SILENT_LOGGER} = require('lib/logger')
const {dbResultError, missingError, unchangedError, validationError} = require('lib/errors')
const {coerce} = require('lib/coerce')

const LIST_LIMIT = 100

function changes (existingDoc, doc) {
  if (existingDoc) {
    return filter(diff(existingDoc, doc), (change, path) => {
      return !['updatedAt', 'updatedBy', 'updatedByUser', 'type'].some(key => key === path || path.startsWith(key + '.'))
    })
  } else {
    return undefined
  }
}

function modelIndexes (model) {
  const propertyIndexes = compact(keys(model.schema.properties).map(property => {
    const {index, unique} = getIn(model, ['schema', 'properties', property, 'x-meta'], {})
    if (index || unique === {index: true}) {
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

  function parseFilterParams (queryParams) {
    if (!queryParams) return undefined
    return keys(queryParams).reduce((acc, name) => {
      const fieldNameMatch = name.match(/^filter\.([a-z0-9_-]+)/i)
      if (fieldNameMatch) {
        const fieldName = fieldNameMatch[1]
        let schema = getIn(model, `schema.properties.${fieldName}`)
        if (schema) {
          let op = 'eq'
          if (name.endsWith(']')) {
            const OP_PATTERN = /\[(eq|ne|in|exists|lt|gt|lte|gte)\]$/i
            const opMatch = name.match(OP_PATTERN)
            if (!opMatch) {
              throw validationError(model, queryParams, `Field name ${fieldName} in filter query param has an invalid operator in square brackets, must match ${OP_PATTERN}`)
            }
            op = opMatch[1]
          }
          if (op === 'exists') {
            schema = {type: 'boolean'}
          } else if (op === 'in') {
            schema = {type: 'array', items: schema}
          }
          const value = coerce(schema, queryParams[name])
          if (op === 'eq') {
            acc[fieldName] = value
          } else {
            const mongoOp = ('$' + op)
            acc[fieldName] = {[mongoOp]: value}
          }
        } else {
          throw validationError(model, queryParams, `Field name ${fieldName} in filter query param not found in schema. Available fields are: ${keys(model.schema.properties).join(', ')}`)
        }
      }
      return acc
    }, {})
  }

  function filteredQuery (query, options) {
    const filterParams = parseFilterParams(options.queryParams)
    if (empty(filterParams)) {
      return query
    } else {
      return merge(query, filterParams)
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
        throw missingError(model, scopedQuery)
      }
    }
  }

  // See: http://mongodb.github.io/node-mongodb-native/3.0/api/Collection.html#find
  async function list (query = {}, options = {}) {
    const queryWithFilter = filteredQuery(query, options)
    const sort = parseSort(options.sort) || defaultSort()
    const limit = options.limit || LIST_LIMIT
    const skip = options.skip || 0
    const projection = options.projection
    const findOptions = {sort, limit, skip, projection}
    let findArgs = await modelCallbacks(api, {query: queryWithFilter, findOptions}, 'before', 'list', options)
    logger.debug(`model_api: ${model.coll}.list query=${json(toMongoDoc(findArgs.query))} findOptions=${json(findArgs.findOptions)}`)
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
    const findOptions = pick(options, ['projection'])
    let findArgs = await modelCallbacks(api, {query, findOptions}, 'before', 'get', options)
    logger.debug(`model_api: ${model.coll}.get query=${json(findArgs.query)} findOptions=${json(findArgs.findOptions)}`)
    let result = renameId(await db().collection(model.coll).findOne(toMongoDoc(findArgs.query), findArgs.findOptions))
    assertScoped(result, query, options)
    result = await modelCallbacks(api, result, 'after', 'get', options)
    if (options.allowMissing === false && !result) throw missingError(model, query)
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
    logger.debug(`model_api: ${model.coll}.create after validation doc=${json(doc)} dbDoc=${json(dbDoc)} user=${json(options.user)} errors=${json(errors)}`)
    if (errors) return Promise.reject(errors)
    dbDoc = compact(await modelCallbacks(api, dbDoc, 'afterValidation', 'create', options))
    await createIndexes(model.coll, modelIndexes(model))
    try {
      logger.verbose(`model_api: ${model.coll}.create before insert dbDoc=${json(dbDoc)}`)
      const result = await db().collection(model.coll).insert(toMongoDoc(dbDoc))
      if (result.result.ok !== 1) return Promise.reject(dbResultError(model, dbDoc, result.result, 'database create failed'))
      const resultDoc = renameId(result.ops[0])
      await modelCallbacks(api, resultDoc, 'afterSave', 'create', options)
      return findOne(doc.id)
    } catch (error) {
      logger.debug(`model_api: ${model.coll}.create error=${json(error)}`, error)
      throw formatDbError(model, dbDoc, error)
    }
  }

  async function update (queryOrId, doc, options = {}) {
    logger.debug(`model_api: ${model.coll}.update queryOrId=${json(queryOrId)} doc=${json(doc)}`)
    // NOTE: only pick keys currently in the schema. Othwerwise if you remove a property from the
    // schema you will never be able to update as the remove property data is still there and won't validate
    const existingDoc = pick((await findOne(queryOrId, options)), keys(getIn(model, 'schema.properties')))
    if (!existingDoc) throw missingError(model, queryOrId)
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
    try {
      const result = await db().collection(model.coll).update(toMongoDoc(query), toMongoDoc(updatedDoc))
      const resultDoc = renameId(updatedDoc)
      if (result.result.nModified === 0) return Promise.reject(dbResultError(model, resultDoc, result.result, 'database update failed'))
      if (options.callbacks !== false) {
        await modelCallbacks(api, resultDoc, 'afterSave', 'update', callbackOptions)
      }
      return findOne(resultDoc.id)
    } catch (error) {
      logger.debug(`model_api: ${model.coll}.update error=${json(error)}`, error)
      throw formatDbError(model, updatedDoc, error)
    }
  }

  async function _delete (queryOrId, options = {}) {
    logger.debug(`model_api: ${model.coll}.delete queryOrId=${json(queryOrId)}`)
    const doc = await findOne(queryOrId, options)
    if (!doc) throw missingError(model, queryOrId)
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
        throw formatDbError(model, query, error)
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
