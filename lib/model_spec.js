const {nil, merge, deepMerge, concat, compact} = require('lib/util')
// const specSchema = require('lib/model_spec_schema')

function mergeSchemas (schema1, schema2) {
  if (nil(schema1) && nil(schema2)) return undefined
  const required = compact(concat(schema1.required, schema2.required))
  return merge(deepMerge(schema1, schema2), {
    required
  })
}

function mergeModels (model1, model2) {
  return compact({
    schema: mergeSchemas(model1.schema, model2.schema)
  })
}

module.exports = {
  mergeSchemas,
  mergeModels
}

// (let [specs (flatten specs)
//       schema (apply merge-schemas (u/compact (map :schema specs)))
//       callbacks (some->> (map :callbacks specs)
//                          (u/compact)
//                          (not-empty)
//                          (map normalize-callbacks)
//                          (apply merge-callbacks)
//                          (sort-callbacks))
//       relationships (apply u/deep-merge (u/compact (map normalized-relationships specs)))
//       indexes (flatten (u/compact (map :indexes specs)))
//       merged-spec (apply merge specs)
//       result (u/compact (assoc merged-spec
//                           :schema schema
//                           :callbacks callbacks
//                           :relationships relationships
//                           :indexes indexes))
//       errors (validate-schema spec-schema result)]
