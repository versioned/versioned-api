const jsonSchema = require('lib/json_schema')
const {merge, deepMergeConcat} = require('lib/util')
const specSchema = require('lib/model_spec_schema')
const metaSchema = require('lib/json_schema_meta')

const ID_PROPERTY = {
  schema: {
    properties: {
      _id: {type: 'string', pattern: '^[a-z0-9]{24}$', 'x-meta': {readable: false, writable: false}},
      id: {'type': 'string', 'x-meta': {writable: false}}
    }
  }
}

const DEFAULTS = {
  features: ['audit', 'changelog'],
  routes: ['list', 'get', 'create', 'update', 'delete']
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
  model = merge(DEFAULTS, model)
  const featuresAndModel = [ID_PROPERTY].concat(features(model)).concat([model])
  const spec = featuresAndModel.reduce(mergeModels)
  const errors = jsonSchema.validate(specSchema, spec) || jsonSchema.validate(metaSchema, spec.schema)
  if (errors) throw errors
  spec.generated = true // Only generate once
  return spec
}

module.exports = {
  DEFAULTS,
  generate
}
