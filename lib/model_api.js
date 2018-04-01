const logger = require('app/config').logger
const {json, merge, compact} = require('lib/util')
const diff = require('lib/diff')
const jsonSchema = require('lib/json_schema')
const {db, formatDbError, createIndexes} = require('lib/mongo')
const modelCallbacks = require('lib/model_callbacks')
const modelSpec = require('lib/model_spec')
const modelMeta = require('lib/model_meta')

function query (idProperty, id) {
  // TODO: check if model has id property
  return {[idProperty]: id}
}

function missingError (id) {
  return {
    status: 404,
    errors: [{type: 'missing', message: `Could not find find document with id=${id}`}]
  }
}

function modelApi (model) {
  model = modelSpec.generate(model)
  const idProperty = modelMeta.idProperty(model)
  // list options:
  // sort: Array of indexes, [['a', 1]] etc.
  // projection: The fields to return in the query. Object of fields to include or exclude (not both), {'a':1}
  // limit: Sets the limit of documents returned in the query.
  // skip: Set to skip N documents ahead in your query (useful for pagination).
  async function list (query = {}, options = {}) {
    const sort = idProperty === 'id' ? [['id', -1]] : undefined
    options = merge({sort}, options)
    return db().collection(model.coll).find(query, options).toArray()
  }

  async function get (id) {
    return db().collection(model.coll).findOne(query(idProperty, id))
  }

  async function findOne (query) {
    return db().collection(model.coll).findOne(query)
  }

  async function create (doc, options = {}) {
    let dbDoc = compact(await modelCallbacks(model, doc, 'before', 'create', options))
    const errors = jsonSchema.validate(model.schema, dbDoc)
    logger.debug(`model_api: ${model.coll}.create doc=${json(doc)} dbDoc=${json(dbDoc)} errors=${json(errors)}`)
    if (errors) return Promise.reject(errors)
    await createIndexes(model.coll, model.schema)
    return db().collection(model.coll).insert(dbDoc)
      .then(result => {
        const resultDoc = result.ops[0]
        return modelCallbacks(model, resultDoc, 'after', 'create', options)
      })
      .catch(dbError => {
        logger.debug(`model_api: ${model.coll}.create dbError dbError=${json(dbError)}`)
        throw formatDbError(dbError)
      })
  }

  async function update (id, doc, options = {}) {
    const existingDoc = await get(id)
    if (!existingDoc) throw missingError(id)
    let updatedDoc = compact(merge(existingDoc, doc))
    updatedDoc = await modelCallbacks(model, updatedDoc, 'before', 'update', options)
    const errors = jsonSchema.validate(model.schema, updatedDoc)
    logger.debug(`model_api: ${model.coll}.update id=${id} doc=${json(doc)} existingDoc=${json(existingDoc)} updatedDoc=${json(updatedDoc)} diff=${json(diff(existingDoc, updatedDoc))} errors=${json(errors)}`)
    if (errors) return Promise.reject(errors)
    await createIndexes(model.coll, model.schema)
    return db().collection(model.coll).update(query(idProperty, id), updatedDoc)
      .then((result) => {
        return modelCallbacks(model, updatedDoc, 'after', 'update', options)
      })
      .catch(dbError => {
        logger.debug(`model_api: ${model.coll}.update dbError dbError=${json(dbError)}`)
        throw formatDbError(dbError)
      })
  }

  async function _delete (id, options = {}) {
    logger.debug(`model_api: ${model.coll}.delete id=${id}`)
    const doc = await get(id)
    if (!doc) throw missingError(id)
    await modelCallbacks(model, doc, 'before', 'delete', options)
    await createIndexes(model.coll, model.schema)
    return db().collection(model.coll).remove(query(idProperty, id))
      .then(() => {
        return modelCallbacks(model, doc, 'after', 'delete', options)
      })
      .catch(dbError => {
        logger.debug(`model_api: ${model.coll}.delete dbError dbError=${json(dbError)}`)
        throw formatDbError(dbError)
      })
  }

  async function count (query = {}) {
    return db().collection(model.coll).count(query)
  }

  return {
    model,
    idProperty,
    list,
    get,
    findOne,
    create,
    update,
    delete: _delete,
    count
  }
}
module.exports = modelApi
