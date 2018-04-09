const {setIn, getIn} = require('lib/util')
const mongo = require('lib/mongo')
const modelApi = require('lib/model_api')
const modelSchema = require('lib/model_spec_schema')
const spaces = require('app/models/spaces')

const spacePattern = getIn(spaces, ['schema', 'properties', 'key', 'pattern'])
const collPattern = getIn(spaces, ['schema', 'properties', 'coll', 'pattern'])

function validationError (message) {
  return {status: 422, errors: [{type: 'validation', message}]}
}

async function validateSpace (doc, options) {
  if (doc.space && !(await spaces.findOne({key: doc.space}))) {
    return validationError(`space '${doc.space}' does not exist`)
  } else {
    return doc
  }
}

async function setColl (doc, options) {
  if (doc.space && doc.coll) {
    const coll = [doc.space, doc.coll].join('_')
    return setIn(doc, ['model', 'coll'], coll)
  } else {
    return doc
  }
}

async function validateCollAvailable (doc, options) {
  const coll = getIn(doc, ['model', 'coll'])
  if (coll && (await mongo.getColls()).includes(coll)) {
    return validationError(`coll '${doc.coll}' is not available - please choose another name`)
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
      space: {type: 'string', pattern: spacePattern, 'x-meta': {update: false, index: true}},
      coll: {type: 'string', pattern: collPattern, 'x-meta': {update: false, index: true}},
      model: modelSchema
    },
    required: ['title', 'space', 'coll', 'model'],
    additionalProperties: false
  },
  callbacks: {
    save: {
      before_validation: [validateSpace, setColl]
    },
    create: {
      before_validation: [validateCollAvailable]
    }
  },
  indexes: [
    {
      keys: {'model.coll': 1},
      options: {unique: true}
    }
  ]
}

module.exports = modelApi(model)
