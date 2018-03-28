const logger = require('app/config').logger
const {json, merge} = require('lib/util')
const jsonSchema = require('lib/json_schema')
const {db, formatDbError, createIndexes} = require('lib/mongo')

function query (id) {
  return {_id: id}
}

const DEFAULTS = {
  routes: ['list', 'get', 'create', 'update', 'delete']
}

function modelApi (modelSpec) {
  const model = merge(DEFAULTS, modelSpec)
  // list options:
  // sort: Array of indexes, [['a', 1]] etc.
  // projection: The fields to return in the query. Object of fields to include or exclude (not both), {'a':1}
  // limit: Sets the limit of documents returned in the query.
  // skip: Set to skip N documents ahead in your query (useful for pagination).
  async function list (query = {}, options = {}) {
    return db().collection(model.coll).find(query, options).toArray()
  }

  async function get (id) {
    return db().collection(model.coll).findOne(query(id))
  }

  async function findOne (query) {
    return db().collection(model.coll).findOne(query)
  }

  async function create (doc) {
    const errors = jsonSchema.validate(model.schema, doc)
    logger.debug(`model_api: ${model.coll}.create doc=${json(doc)} errors=${json(errors)}`)
    if (errors) return Promise.reject(errors)
    await createIndexes(model.coll, model.schema)
    return db().collection(model.coll).insert(doc)
      .then(result => result.ops[0])
      .catch(dbError => {
        logger.debug(`model_api: ${model.coll}.create dbError dbError=${json(dbError)}`)
        throw formatDbError(dbError)
      })
  }

  async function update (id, doc) {
    const existingDoc = await get(id)
    const updatedDoc = merge(existingDoc, doc)
    const errors = jsonSchema.validate(model.schema, updatedDoc)
    logger.debug(`model_api: ${model.coll}.update id=${id} doc=${json(doc)} updatedDoc=${json(updatedDoc)} errors=${json(errors)}`)
    if (errors) return Promise.reject(errors)
    await createIndexes(model.coll, model.schema)
    return db().collection(model.coll).updateOne(query(id), updatedDoc)
      .catch(dbError => {
        logger.debug(`model_api: ${model.coll}.update dbError dbError=${json(dbError)}`)
        throw formatDbError(dbError)
      })
  }

  async function _delete (id) {
    logger.debug(`model_api: ${model.coll}.delete id=${id}`)
    await createIndexes(model.coll, model.schema)
    return db().collection(model.coll).remove(query(id))
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
