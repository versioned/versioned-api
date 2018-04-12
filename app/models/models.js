const {setIn, getIn} = require('lib/util')
const mongo = require('lib/mongo')
const modelApi = require('lib/model_api')
const modelSchema = require('lib/model_spec_schema')
const spaces = require('app/models/spaces')
const swagger = require('app/swagger')
const jsonSchema = require('lib/json_schema')
const swaggerSchema = require('public/openapi-schema')

const collPattern = getIn(spaces, ['schema', 'properties', 'coll', 'pattern'])

function validationError (message) {
  return {status: 422, errors: [{type: 'validation', message}]}
}

function getColl (model) {
  if (model.spaceId && model.coll) {
    const prefix = `s${model.spaceId}`
    return [prefix, model.coll].join('_')
  } else {
    return undefined
  }
}

async function validateSpace (doc, options) {
  if (doc.spaceId && !(await spaces.findOne({id: doc.spaceId}))) {
    return validationError(`space '${doc.spaceId}' does not exist`)
  } else {
    return doc
  }
}

async function setColl (doc, options) {
  const coll = getColl(doc)
  if (coll) {
    return setIn(doc, ['model', 'coll'], coll)
  } else {
    return doc
  }
}

async function validateModel (doc, options) {
  if (doc.model) modelApi(doc.model) // creating the API this should not throw any error
  return doc
}

async function validateSwagger (doc, options) {
  if (doc.model && doc.spaceId) {
    let systemSwagger = await swagger()
    let spaceSwagger = await swagger({spaceId: doc.spaceId, models: [doc.model]})
    for (let swagger of [systemSwagger, spaceSwagger]) {
      const errors = jsonSchema.validate(swaggerSchema, swagger)
      if (errors) throw errors
    }
  }
  return doc
}

async function validateCollAvailable (doc, options) {
  const coll = getIn(doc, ['model', 'coll'])
  if (coll && (await mongo.getColls()).includes(coll)) {
    return validationError(`coll '${doc.coll}' is not available - please choose another name`)
  } else {
    return doc
  }
}

async function deleteColl (doc, options) {
  const coll = getColl(doc)
  const colls = await mongo.getColls()
  if (colls.includes(coll)) {
    await mongo.db().collection(coll).drop()
  }
  return doc
}

const model = {
  coll: 'models',
  schema: {
    // Need definitions here in the root for $ref to resolve
    definitions: modelSchema.definitions,
    type: 'object',
    properties: {
      title: {type: 'string'},
      spaceId: {type: 'integer', 'x-meta': {update: false, index: true}},
      coll: {type: 'string', pattern: collPattern, 'x-meta': {update: false, index: true}},
      model: modelSchema
    },
    required: ['title', 'spaceId', 'coll', 'model'],
    additionalProperties: false
  },
  callbacks: {
    save: {
      before_validation: [validateSpace, setColl, validateModel],
      after_validation: [validateSwagger]
    },
    create: {
      before_validation: [validateCollAvailable]
    },
    delete: {
      after_delete: [deleteColl]
    }
  },
  indexes: [
    {
      keys: {'model.coll': 1},
      options: {unique: true}
    },
    {
      keys: {spaceId: 1, coll: 1},
      options: {unique: true}
    }
  ]
}

module.exports = Object.assign(modelApi(model), {
  getColl
})
