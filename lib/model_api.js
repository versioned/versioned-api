const logger = require('app/config').logger
const {json} = require('lib/util')
const jsonSchema = require('lib/json_schema')
const {db, formatDbError, createIndexes} = require('lib/mongo')

function modelApi (model) {
  async function create (doc) {
    const errors = jsonSchema.validate(model.schema, doc)
    logger.debug(`${model.coll}.create doc=${json(doc)} errors=${json(errors)}`)
    if (errors) return Promise.reject(errors)
    await createIndexes(model.coll, model.schema)
    return db().collection(model.coll).insert(doc)
      .then(result => result.ops[0])
      .catch(dbError => {
        logger.debug(`${model.coll}.create dbError dbError=${json(dbError)}`)
        throw formatDbError(dbError)
      })
  }

  async function findOne (query) {
    return db().collection(model.coll).findOne(query)
  }

  return {
    create,
    findOne
  }
}
module.exports = modelApi
