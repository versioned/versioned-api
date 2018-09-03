// See: https://docs.mongodb.com/v3.0/tutorial/create-an-auto-incrementing-field/

const {compact, merge, notEmpty, keys, filter, getIn} = require('lib/util')
const {nextSequence} = require('app/config').modules.mongo

function sequenceName (space, model, property) {
  return compact([getIn(space, 'dbKey'), model.coll, property]).join('_')
}

async function setSequenceFields (doc, options) {
  const properties = getIn(options, 'model.schema.properties')
  const sequenceProperties = keys(filter(properties, (p) => getIn(p, 'x-meta.sequence')))
  const sequences = {}
  for (let property of sequenceProperties) {
    sequences[property] = await nextSequence(sequenceName(options.space, options.model, property))
  }
  if (notEmpty(sequenceProperties)) {
    return merge(doc, sequences)
  }
}

const model = {
  callbacks: {
    create: {
      beforeValidation: [setSequenceFields]
    }
  }
}

module.exports = model
