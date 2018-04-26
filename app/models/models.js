const {merge, concat, compact, validInt, setIn, getIn, values, keys} = require('lib/util')
const config = require('app/config')
const {logger, mongo} = config.modules
const modelApi = require('lib/model_api')
const modelSpec = require('lib/model_spec')
const modelSchema = require('lib/model_spec_schema')
const spaces = require('app/models/spaces')
const swagger = require('app/swagger')
const jsonSchema = require('lib/json_schema')
const swaggerSchema = require('public/openapi-schema')
const {withoutRefs} = require('lib/json_schema')

const coll = 'models'
const collPattern = getIn(spaces, ['schema', 'properties', 'coll', 'pattern'])

async function getColl (model) {
  const space = model.spaceId && (await spaces.findOne(model.spaceId))
  if (space && model.coll) {
    const prefix = validInt(model.spaceId) ? `s${model.spaceId}` : space.key
    return [prefix, model.coll].join('_')
  } else {
    return undefined
  }
}

async function validateDataLimit (doc, options) {
  const count = await options.api.count()
  if (count >= config.DATA_LIMIT) {
    throw modelApi.validationError(options.model, doc, `You cannot create more than ${config.DATA_LIMIT} documents in your current plan`)
  }
  return doc
}

async function getApi (space, model) {
  const modelInstance = merge(model.model, {
    callbacks: {
      create: {
        beforeValidation: [validateDataLimit]
      }
    }
  })
  const mongo = await spaces.getMongo(space)
  return modelApi(modelInstance, mongo, logger)
}

async function validateSpace (doc, options) {
  if (doc.spaceId && !(await spaces.findOne(doc.spaceId))) {
    throw modelApi.validationError(options.model, doc, `space '${doc.spaceId}' does not exist`, 'spaceId')
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

async function setAccountId (doc, options) {
  if (!doc.spaceId) return doc
  const space = await spaces.get(doc.spaceId)
  return merge(doc, {accountId: space.accountId})
}

async function setFeatures (doc, options) {
  if (doc.features) {
    const features = concat(modelSpec.DEFAULTS.features, doc.features)
    return setIn(doc, ['model', 'features'], features)
  } else {
    return doc
  }
}

async function validateModel (doc, options) {
  if (doc.model) modelApi(doc.model, mongo) // creating the API this should not throw any error
  return doc
}

async function validatePropertiesLimit (doc, options) {
  const properties = getIn(doc, ['model', 'schema', 'properties'])
  if (properties && keys(properties).length > config.PROPERTY_LIMIT) {
    throw modelApi.validationError(options.model, doc, `You can not have more than ${config.PROPERTY_LIMIT} properties`)
  }
  return doc
}

async function validateModelsLimit (doc, options) {
  const modelsCount = doc.spaceId && (await modelApi({coll}, mongo).count({spaceId: doc.spaceId}))
  if (modelsCount && modelsCount >= config.MODELS_LIMIT) {
    throw modelApi.validationError(options.model, doc, `You cannot have more than ${config.MODELS_LIMIT} models per space`)
  }
  return doc
}

const X_META_SCHEMA = {
  type: 'object',
  properties: {
    id: {type: 'boolean'},
    readable: {type: 'boolean'},
    writable: {type: 'boolean'},
    update: {type: 'boolean'},
    versioned: {type: 'boolean'},
    index: {type: ['boolean', 'integer']},
    unique: {type: 'boolean'}
  },
  additionalProperties: false
}

// NOTE: Using this special case validation instead of patternProperties since
// patternProperties is not supported by OpenAPI
async function validateXMeta (doc, options) {
  const properties = getIn(doc, ['model', 'schema', 'properties'])
  const xMetaList = compact(values(properties).map(p => p['x-meta']))
  for (let xMeta of xMetaList) {
    const errors = jsonSchema.validate(X_META_SCHEMA, xMeta)
    if (errors) throw errors
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
    throw modelApi.validationError(options.model, doc, `coll '${doc.coll}' is not available - please choose another name`, 'coll')
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
    type: 'object',
    properties: {
      name: {type: 'string'},
      accountId: {type: 'string', 'x-meta': {write: false, index: true}},
      spaceId: {type: 'string', 'x-meta': {update: false, index: true}},
      coll: {type: 'string', pattern: collPattern, 'x-meta': {update: false, index: true}},
      features: {type: 'array', items: {enum: ['published']}},
      model: withoutRefs(modelSchema)
    },
    required: ['name', 'spaceId', 'accountId', 'coll', 'model'],
    additionalProperties: false
  },
  callbacks: {
    save: {
      beforeValidation: [validateSpace, setColl, setAccountId, setFeatures, validateModel, validatePropertiesLimit],
      afterValidation: [validateXMeta, validateSwagger]
    },
    create: {
      beforeValidation: [validateCollAvailable, validateModelsLimit]
    },
    delete: {
      after: [deleteColl]
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
    },
    {
      keys: {spaceId: 1, name: 1},
      options: {unique: true}
    }
  ]
}

module.exports = Object.assign(modelApi(model, mongo, logger), {
  getColl,
  getApi
})
