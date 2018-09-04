// See: https://docs.mongodb.com/v3.0/tutorial/create-an-auto-incrementing-field/

const {validInt, compact, merge, notEmpty, keys, filter, getIn} = require('lib/util')
const {nextSequence} = require('app/config').modules.mongo

function validSequence (value) {
  return validInt(value) && value > 0
}

function sequenceName (space, model, property) {
  return compact([getIn(space, 'dbKey'), model.coll, property]).join('_')
}

async function setSequenceFields (doc, options) {
  const properties = getIn(options, 'model.schema.properties')
  const sequenceProperties = keys(filter(properties, (p) => getIn(p, 'x-meta.sequence')))
  const sequences = {}
  for (let property of sequenceProperties) {
    const name = sequenceName(options.space, options.model, property)
    const value = doc[property]
    if (validSequence(value)) {
      await nextSequence(name, {value})
      sequences[property] = value
    } else {
      sequences[property] = await nextSequence(name)
    }
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
