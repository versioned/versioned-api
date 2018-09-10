const {isObject, intersection, array, keyValues, difference, dbFriendly, notEmpty, empty, filter, deepMerge, merge, concat, compact, setIn, mergeIn, getIn, keys} = require('lib/util')
const config = require('app/config')
const {logger, mongo} = config.modules
const modelApi = require('lib/model_api')
const modelSpec = require('lib/model_spec')
const modelSchema = require('lib/model_spec_schema')
const requireSpaces = () => require('app/models/spaces')
const requireSwagger = () => require('app/swagger')
const jsonSchema = require('lib/json_schema')
const swaggerSchema = require('public/openapi-schema')
const {withoutRefs} = require('lib/json_schema')
const {validationError, accessError} = require('lib/errors')
const DEFAULTS = require('lib/model_spec').DEFAULTS
const {sortedCallback} = require('lib/model_callbacks_helper')
const modelMeta = require('lib/model_meta')
const {PLANS} = require('app/plans')

const PROPERTY_NAME_PATTERN = '^[a-zA-Z][a-zA-Z0-9_-]{0,30}$'
const MAX_LENGTH_LIMIT = 50000
const coll = 'models'
const collSchema = getIn(modelSchema, ['properties', 'coll'])

async function getColl (model) {
  const space = model.spaceId && (await requireSpaces().get(model.spaceId))
  if (space && model.coll) {
    const prefix = 'm'
    const qualifier = space.dbKey
    return compact([prefix, qualifier, model.coll]).join('_')
  } else {
    return undefined
  }
}

async function validateDataLimit (doc, options) {
  if (!options.space.mongodbUrl) {
    const planKey = options.account.plan
    const plan = PLANS[planKey]
    const count = await options.api.count()
    if (count >= plan.DATA_LIMIT) {
      throw validationError(options.model, doc, `You cannot create more than ${plan.DATA_LIMIT} documents in your current plan (${planKey}). Please upgrade and/or use a dedicated database if you need more documents.`)
    }
  }
}

function shouldCheckUnique (property) {
  return getIn(property, 'x-meta.unique') === true ||
    ['one-to-one', 'one-to-many'].includes(getIn(property, 'x-meta.relationship.type'))
}

function getId (value) {
  return isObject(value) ? getIn(value, 'id') : value
}

async function checkUnique (doc, options) {
  if (empty(doc)) return
  const properties = getIn(options, 'model.schema.properties')
  for (let key of keys(properties)) {
    const property = getIn(options, `model.schema.properties.${key}`)
    const isRelationship = getIn(options, `model.schema.properties.${key}.x-meta.relationship`)
    const getValue = (v) => isRelationship ? getId(v) : v
    if (shouldCheckUnique(property)) {
      const values = array(doc[key]).map(getValue)
      if (notEmpty(values)) {
        const query = {[key]: {$in: values}}
        const projection = {id: 1, [key]: 1, title: 1}
        const duplicates = (await options.api.list(query, {projection})).filter(d => d.id !== doc.id)
        if (duplicates.length > 0) {
          const allDuplicatesValues = duplicates.map(d => d[key]).reduce((acc, value) => {
            acc = acc.concat(array(value).map(getValue))
            return acc
          }, [])
          const duplicatedValues = intersection(allDuplicatesValues, values)
          const prettyDuplicates = duplicates.map(d => `"${d.title || d.id}"`)
          throw validationError(options.model, doc, `already exists (must be unique): ${duplicatedValues.join(', ')}. Documents with duplicates: ${prettyDuplicates.join(', ')}`, key)
        }
      }
    }
  }
}

async function getApi (space, model) {
  const modelInstance = merge(model.model, {
    callbacks: {
      list: {
        before: [checkPublishedQueryForClients]
      },
      get: {
        before: [checkPublishedQueryForClients]
      },
      save: {
        beforeValidation: [convertRelObjectsToIds],
        afterValidation: [checkUnique]
      },
      create: {
        beforeValidation: [validateDataLimit]
      }
    }
  })
  const mongo = await requireSpaces().getMongo(space)
  return modelApi(modelInstance, mongo, logger)
}

async function validateSpace (doc, options) {
  const accountId = getIn(options, 'account.id')
  if (doc.spaceId && !(await requireSpaces().get({id: doc.spaceId, accountId}))) {
    throw validationError(options.model, doc, `space '${doc.spaceId}' does not exist in account ${accountId}`, 'spaceId')
  } else {
    return doc
  }
}

function setDefaultColl (doc, options) {
  if (notEmpty(doc.name) && empty(doc.coll)) {
    return merge(doc, {coll: dbFriendly(doc.name)})
  }
}

function setDefaultTitleProperty (doc, options) {
  const path = 'model.schema.x-meta.titleProperty'
  const titleProperty = getIn(doc, path)
  if (keys(doc.properties).includes(titleProperty)) return
  return setIn(doc, path, modelMeta.titleProperty(doc.model))
}

function validateMaxLength (doc, options) {
  for (let [name, property] of keyValues(getIn(doc, 'model.schema.properties'))) {
    const maxLength = getIn(property, 'maxLength', 0)
    if (maxLength > MAX_LENGTH_LIMIT) {
      throw validationError(options.model, doc, `The maxLength is ${maxLength} but is not allowed to be more than ${MAX_LENGTH_LIMIT}`, name)
    }
  }
}

async function setModelColl (doc, options) {
  const coll = await getColl(doc)
  if (coll) {
    return deepMerge(doc, {
      model: {
        coll,
        type: doc.coll
      }
    })
  } else {
    return doc
  }
}

async function setAccountId (doc, options) {
  if (!doc.spaceId) return doc
  const space = await requireSpaces().get(doc.spaceId)
  if (space) {
    return merge(doc, {accountId: space.accountId})
  }
}

async function setFeatures (doc, options) {
  if (doc.features) {
    const features = concat(modelSpec.DEFAULTS.features, doc.features)
    return setIn(doc, ['model', 'features'], features)
  } else {
    return doc
  }
}

const convertRelObjectsToIds = sortedCallback('first', async (doc, options) => {
  const properties = getIn(options.model, 'schema.properties')
  if (empty(properties)) return
  const converted = keys(doc).reduce((acc, key) => {
    const value = doc[key]
    const valueHasObject = array(value || []).find(v => typeof v === 'object')
    const isRelationship = getIn(properties, `${key}.x-meta.relationship.toType`)
    const type = getIn(properties, `${key}.type`)
    const itemsType = getIn(properties, `${key}.items.type`)
    if (isRelationship && type === 'string' && valueHasObject) {
      acc[key] = value.id
    } else if (isRelationship && type === 'array' && itemsType === 'string' && valueHasObject) {
      acc[key] = value.map(item => typeof item === 'object' ? item.id : item)
    }
    return acc
  }, {})
  if (notEmpty(converted)) {
    return merge(doc, converted)
  }
})

function checkPublishedQueryForClients (doc, options) {
  if (options.user || !options.queryParams) return
  // NOTE: when not authenticated as a user, i.e. when a client uses an apiToken,
  // the client is only allowed to fetch the published version and specific versions for
  // preview by versionToken
  const explanation = 'As a client using an API token you may fetch either the published version (i.e. add published=1 to the query) or preview specific versions with the versionToken param'
  if (options.queryParams.versions) {
    throw accessError(`The versions query parameter is now allowed. ${explanation}`)
  }
  if (!options.queryParams.published && !options.queryParams.versionToken) {
    throw accessError(`Missing one of the published or versionToken query parameters. ${explanation}`)
  }
}

async function setModelSchema (doc, options) {
  if (empty(doc.model)) return
  const xMeta = compact({
    spaceId: doc.spaceId,
    writeRequiresAdmin: false,
    dataModel: true,
    propertiesOrder: doc.propertiesOrder
  })
  return mergeIn(doc, ['model', 'schema', 'x-meta'], xMeta)
}

function setPropertiesOrder (doc, options) {
  const properties = getIn(doc, 'model.schema.properties')
  if (empty(properties)) return
  const valid = filter((doc.propertiesOrder || []), (key) => keys(properties).includes(key))
  const missing = difference(keys(properties), valid)
  const propertiesOrder = concat(valid, missing)
  if (notEmpty(propertiesOrder)) {
    return merge(doc, {propertiesOrder})
  }
}

function validatePropertyNames (doc, options) {
  const propertyNames = keys(getIn(doc, 'model.schema.properties'))
  const invalidNames = filter(propertyNames, name => !name.match(new RegExp(PROPERTY_NAME_PATTERN)))
  if (notEmpty(invalidNames)) {
    throw validationError(options.model, doc, `The following field names are invalid: ${invalidNames.join(', ')}`)
  }
  return doc
}

async function validateModel (doc, options) {
  if (doc.model) modelApi(doc.model, mongo) // creating the API this should not throw any error
  return doc
}

async function validatePropertiesLimit (doc, options) {
  const properties = getIn(doc, ['model', 'schema', 'properties'])
  if (properties && keys(properties).length > config.PROPERTY_LIMIT) {
    throw validationError(options.model, doc, `You can not have more than ${config.PROPERTY_LIMIT} properties. Please contact us if you think you need more properties.`)
  }
  return doc
}

async function validateModelsLimit (doc, options) {
  const modelsCount = doc.spaceId && (await modelApi({coll}, mongo).count({spaceId: doc.spaceId}))
  if (modelsCount && modelsCount >= config.MODELS_LIMIT) {
    throw validationError(options.model, doc, `You cannot have more than ${config.MODELS_LIMIT} models per space. Please contact support if you think you need more models.`)
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
    sequence: {type: 'boolean'},
    unique: {
      anyOf: [
        {type: 'boolean'},
        {
          type: 'object',
          properties: {
            index: {enum: [true]}
          },
          additionalProperties: false,
          required: ['index']
        }
      ]
    },
    mergeChangelog: {type: 'boolean'},
    field: {
      type: 'object',
      properties: {
        name: {type: 'string'}
      },
      additionalProperties: false
    },
    relationship: {
      type: 'object',
      properties: {
        toType: collSchema,
        type: {enum: ['one-to-one', 'one-to-many', 'many-to-one', 'many-to-many']},
        // NOTE: the presence of a toField means the relationship is two-way
        toField: {type: 'string', pattern: PROPERTY_NAME_PATTERN},
        // NOTE: the name is the optional property name used when fetching relationships
        name: {type: 'string'},
        onDelete: {enum: ['cascade']}
      },
      required: ['toType', 'type'],
      additionalProperties: false
    }
  },
  additionalProperties: false
}

function uniqueAllowed (property) {
  return ['string', 'integer', 'number'].includes(property.type) && !getIn(property, 'x-meta.relationship')
}

// NOTE: Using this special case validation instead of patternProperties since
// patternProperties is not supported by OpenAPI
async function validateXMeta (doc, options) {
  const properties = getIn(doc, ['model', 'schema', 'properties'])
  if (empty(properties)) return
  for (let [key, property] of keyValues(properties)) {
    const xMeta = property['x-meta']
    if (xMeta) {
      const path = `model.schema.properties.${key}.x-meta`
      const errors = jsonSchema.validate(X_META_SCHEMA, xMeta, {path})
      if (errors) throw errors
      if (xMeta.unique && !uniqueAllowed(property)) {
        throw validationError(options.model, doc, `unique is not allowed for field`, path)
      }
    }
  }
}

async function validateSwagger (doc, options) {
  if (doc.model && doc.spaceId) {
    const swagger = requireSwagger()
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
    throw validationError(options.model, doc, `'${doc.coll}' is not available - please choose another name`, 'coll')
  } else {
    return doc
  }
}

async function deleteColl (doc, options) {
  const modelColl = getIn(doc, ['model', 'coll'])
  const versionedColl = `${modelColl}_versions`
  const colls = [modelColl, versionedColl]
  const allColls = await mongo.getColls()
  for (let coll of colls) {
    if (allColls.includes(coll)) {
      await mongo.db().collection(coll).drop()
    }
  }
}

const model = {
  coll,
  features: concat(DEFAULTS.features, ['relationships_meta']),
  schema: {
    type: 'object',
    properties: {
      name: {type: 'string'},
      accountId: {type: 'string', 'x-meta': {writable: false, index: true}},
      spaceId: {
        type: 'string',
        'x-meta': {
          update: false,
          index: true,
          relationship: {
            toType: 'spaces',
            toField: 'models',
            name: 'space',
            type: 'many-to-one',
            onDelete: 'cascade'
          }
        }
      },
      coll: merge(collSchema, {'x-meta': {update: false, index: true}}),
      features: {
        type: 'array',
        items: {enum: ['search', 'published']}
      },
      propertiesOrder: {type: 'array', items: {type: 'string'}},
      model: withoutRefs(modelSchema)
    },
    required: ['name', 'spaceId', 'accountId', 'coll', 'model'],
    additionalProperties: false
  },
  callbacks: {
    save: {
      beforeValidation: [validateSpace, setDefaultColl, setPropertiesOrder, validateMaxLength, setModelColl, setAccountId, setFeatures, setModelSchema, validatePropertyNames, validateModel, validatePropertiesLimit, setDefaultTitleProperty],
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
