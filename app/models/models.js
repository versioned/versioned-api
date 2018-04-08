const {getIn} = require('lib/util')
const mongo = require('lib/mongo')
const modelApi = require('lib/model_api')
const modelSchema = require('lib/model_spec_schema')

async function validateCollAvailableCallback (doc, options) {
  const coll = getIn(doc, ['model', 'coll'])
  const existingColls = await mongo.getColls()
  if (coll && (coll === 'sys' || coll.startsWith('sys_') || existingColls.includes(coll))) {
    const error = {
      type: 'validation',
      message: `coll name '${coll}' is not available - please choose another one`
    }
    return {status: 422, errors: [error]}
  } else {
    return doc
  }
}

const model = {
  coll: 'sys_models',
  schema: {
    // Need definitions here in the root for $ref to resolve
    definitions: modelSchema.definitions,
    type: 'object',
    properties: {
      name: {type: 'string'},
      model: modelSchema
    },
    required: ['name', 'model'],
    additionalProperties: false
  },
  callbacks: {
    save: {
      before_validation: [validateCollAvailableCallback]
    }
  }
}

module.exports = modelApi(model)
