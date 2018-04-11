const jsonSchema = require('lib/json_schema')
const {merge, deepMergeConcat, concat} = require('lib/util')
const specSchema = require('lib/model_spec_schema')
const metaSchema = require('lib/json_schema_meta')

const DEFAULTS = {
  features: ['integer_id', 'audit', 'changelog'],
  routes: ['list', 'get', 'create', 'update', 'delete']
}

function mergeModels (model1, model2) {
  return deepMergeConcat(model1, model2)
}

function requireFeature (feature) {
  return require(`app/model_features/${feature}`)
}

function features (model) {
  if (!model.features) return undefined
  return model.features.map(requireFeature)
}

function generate (model) {
  model = merge(DEFAULTS, model)
  const featuresAndModel = concat(features(model), [model])
  const spec = featuresAndModel.reduce(mergeModels)
  const errors = jsonSchema.validate(specSchema, spec) || jsonSchema.validate(metaSchema, spec.schema)
  if (errors) throw errors
  return spec
}

module.exports = {
  DEFAULTS,
  generate
}
