const {setIn, getIn} = require('lib/util')
const mongo = require('lib/mongo')
const modelApi = require('lib/model_api')
const modelSchema = require('lib/model_spec_schema')
const spaces = require('app/models/spaces')

const collPattern = getIn(spaces, ['schema', 'properties', 'coll', 'pattern'])

function validationError (message) {
  return {status: 422, errors: [{type: 'validation', message}]}
}

function getColl (model) {
  if (model.space_id && model.coll) {
    const prefix = `s${model.space_id}`
    return [prefix, model.coll].join('_')
  } else {
    return undefined
  }
}

async function validateSpace (doc, options) {
  if (doc.space_id && !(await spaces.findOne({id: doc.space_id}))) {
    return validationError(`space '${doc.space_id}' does not exist`)
  } else {
    return doc
  }
}

async function setColl (doc, options) {
  const coll = getColl(doc)
  if (coll) {
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

async function deleteColl (doc, options) {
  const coll = getColl(doc)
  const colls = await mongo.getColls()
  if (colls.includes(coll)) {
    await mongo.db().collection(coll).drop()
  }
  return doc
}

const model = {
  coll: 'models',
  schema: {
    // Need definitions here in the root for $ref to resolve
    definitions: modelSchema.definitions,
    type: 'object',
    properties: {
      title: {type: 'string'},
      space_id: {type: 'integer', 'x-meta': {update: false, index: true}},
      coll: {type: 'string', pattern: collPattern, 'x-meta': {update: false, index: true}},
      model: modelSchema
    },
    required: ['title', 'space_id', 'coll', 'model'],
    additionalProperties: false
  },
  callbacks: {
    save: {
      before_validation: [validateSpace, setColl]
    },
    create: {
      before_validation: [validateCollAvailable]
    },
    delete: {
      after_delete: [deleteColl]
    }
  },
  indexes: [
    {
      keys: {'model.coll': 1},
      options: {unique: true}
    },
    {
      keys: {space_id: 1, coll: 1},
      options: {unique: true}
    }
  ]
}

module.exports = Object.assign(modelApi(model), {
  getColl
})
