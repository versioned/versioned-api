const jsonSchema = require('lib/json_schema')
const {intersection, getIn, notEmpty, keys, merge, deepMergeConcat} = require('lib/util')
const specSchema = require('lib/model_spec_schema')
const metaSchema = require('lib/json_schema_meta')
const {validationError} = require('lib/errors')

const DEFAULTS = {
  features: ['mongo_id', 'audit', 'changelog'],
  routes: ['list', 'get', 'create', 'update', 'delete']
}

const RESERVED_PROPERTY_NAMES = [
  'id',
  '_id',
  'type',
  'sys'
]

function validatePropertyNames (model, reservedNames) {
  const invalidNames = intersection(keys(getIn(model, 'schema.properties')), reservedNames)
  if (notEmpty(invalidNames)) {
    throw validationError(model, model, `The following field names are reserved and must be changed: ${invalidNames.join(', ')}`)
  }
}

function mergeModels (model1, model2) {
  return deepMergeConcat(model1, model2)
}

function requireFeature (feature) {
  return require(`app/model_features/${feature}`)
}

function features (model) {
  if (!model.features) return []
  return model.features.map(requireFeature)
}

function generate (model) {
  let spec = merge(DEFAULTS, model)
  validatePropertyNames(spec, RESERVED_PROPERTY_NAMES)
  if (notEmpty(spec.features)) {
    const featuresSpec = features(spec).reduce(mergeModels)
    const featuresProperties = keys(getIn(featuresSpec, 'schema.properties'))
    validatePropertyNames(spec, featuresProperties)
    spec = mergeModels(featuresSpec, spec)
  }
  const errors = jsonSchema.validate(specSchema, spec) || jsonSchema.validate(metaSchema, spec.schema)
  if (errors) throw errors
  spec.generated = true // Only generate once
  return spec
}

module.exports = {
  DEFAULTS,
  generate
}
