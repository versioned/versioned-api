const {validInt, setIn, getIn, keys} = require('lib/util')
const mongo = require('lib/mongo')
const modelApi = require('lib/model_api')
const modelSchema = require('lib/model_spec_schema')
const spaces = require('app/models/spaces')
const swagger = require('app/swagger')
const jsonSchema = require('lib/json_schema')
const swaggerSchema = require('public/openapi-schema')
const config = require('app/config')
const logger = config.logger

const coll = 'models'
const collPattern = getIn(spaces, ['schema', 'properties', 'coll', 'pattern'])

function validationError (message) {
  return {status: 422, errors: [{type: 'validation', message}]}
}

async function getColl (model) {
  const space = model.spaceId && (await spaces.findOne(model.spaceId))
  if (space && model.coll) {
    const prefix = validInt(model.spaceId) ? `s${model.spaceId}` : space.key
    return [prefix, model.coll].join('_')
  } else {
    return undefined
  }
}

async function validateSpace (doc, options) {
  if (doc.spaceId && !(await spaces.findOne(doc.spaceId))) {
    throw validationError(`space '${doc.spaceId}' does not exist`)
  } else {
    return doc
  }
}

async function setColl (doc, options) {
  const coll = await getColl(doc)
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

async function validatePropertiesLimit (doc, options) {
  const properties = getIn(doc, ['model', 'schema', 'properties'])
  if (properties && keys(properties).length > config.PROPERTY_LIMIT) {
    throw validationError(`You can not have more than ${config.PROPERTY_LIMIT} properties`)
  }
  return doc
}

async function validateModelsLimit (doc, options) {
  const modelsCount = doc.spaceId && (await modelApi({coll}).count({spaceId: doc.spaceId}))
  if (modelsCount && modelsCount >= config.MODELS_LIMIT) {
    throw validationError(`You cannot have more than ${config.MODELS_LIMIT} models per space`)
  }
  return doc
}

async function validateSwagger (doc, options) {
  if (doc.model && doc.spaceId) {
    let systemSwagger = await swagger()
    let spaceSwagger = await swagger({spaceId: doc.spaceId, models: [doc]})
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
    throw validationError(`coll '${doc.coll}' is not available - please choose another name`)
  } else {
    return doc
  }
}

async function deleteColl (doc, options) {
  const coll = getIn(doc, ['model', 'coll'])
  const colls = await mongo.getColls()
  if (colls.includes(coll)) {
    await mongo.db().collection(coll).drop()
  }
  return doc
}

const model = {
  coll,
  schema: {
    // Need definitions here in the root for $ref to resolve
    definitions: modelSchema.definitions,
    type: 'object',
    properties: {
      title: {type: 'string'},
      spaceId: {type: 'string', 'x-meta': {update: false, index: true}},
      coll: {type: 'string', pattern: collPattern, 'x-meta': {update: false, index: true}},
      model: modelSchema
    },
    required: ['title', 'spaceId', 'coll', 'model'],
    additionalProperties: false
  },
  callbacks: {
    save: {
      before_validation: [validateSpace, setColl, validateModel, validatePropertiesLimit],
      after_validation: [validateSwagger]
    },
    create: {
      before_validation: [validateCollAvailable, validateModelsLimit]
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

module.exports = Object.assign(modelApi(model, logger), {
  getColl
})
