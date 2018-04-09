const {merge, getIn} = require('lib/util')
const mongo = require('lib/mongo')
const modelApi = require('lib/model_api')
const modelSchema = require('lib/model_spec_schema')
const spaces = require('app/models/spaces')

const spacePattern = getIn(spaces, ['schema', 'properties', 'key', 'pattern'])

function validationError (message) {
  return {status: 422, errors: [{type: 'validation', message}]}
}

async function validateCollAvailable (doc, options) {
  const coll = getIn(doc, ['model', 'coll'])
  if (coll && (await mongo.getColls()).includes(coll)) {
    return validationError(`coll '${doc.coll}' is not available - please choose another name`)
  } else {
    return doc
  }
}

async function validateSpace (doc, options) {
  if (doc.space && !(await spaces.findOne({key: doc.space}))) {
    return validationError(`space '${doc.space}' does not exist`)
  } else {
    return doc
  }
}

const model = {
  coll: 'models',
  schema: {
    // Need definitions here in the root for $ref to resolve
    definitions: modelSchema.definitions,
    type: 'object',
    properties: {
      title: {type: 'string'},
      space: {type: 'string', pattern: spacePattern, 'x-meta': {update: false}},
      model: modelSchema
    },
    required: ['title', 'space', 'model'],
    additionalProperties: false
  },
  callbacks: {
    save: {
      before_validation: [validateCollAvailable, validateSpace]
    }
  }
}

function getColl (doc) {
  const space = doc.space
  const coll = getIn(doc, ['model', 'coll'])
  if (space && coll) {
    return [space, coll].join('_')
  } else {
    return undefined
  }
}

function getModel (doc) {
  const coll = getColl(doc)
  return merge(doc, {coll})
}

module.exports = Object.assign(modelApi(model), {
  getModel
})
