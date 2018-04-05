const jsonSchema = require('lib/json_schema')
const {json, deepMergeConcat, concat} = require('lib/util')
const specSchema = require('lib/model_spec_schema')

const DEFAULTS = {
  features: ['integer_id', 'audit'],
  routes: ['list', 'get', 'create', 'update', 'delete']
}

function mergeModels (model1, model2) {
  return deepMergeConcat(model1, model2)
}

function requireFeature (feature) {
  return require(`lib/model_features/${feature}`)
}

function features (model) {
  if (!model.features) return undefined
  return model.features.map(requireFeature)
}

function generate (model) {
  model = mergeModels(DEFAULTS, model)
  const featuresAndModel = concat(features(model), [model])
  const spec = featuresAndModel.reduce(mergeModels)
  const errors = jsonSchema.validate(specSchema, spec)
  if (errors) throw new Error(`Invalid schema for model ${model.coll} spec=${json(spec)} errors=${json(errors)}`)
  return spec
}

module.exports = {
  DEFAULTS,
  generate
}
