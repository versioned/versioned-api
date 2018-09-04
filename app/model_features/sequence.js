// See: https://docs.mongodb.com/v3.0/tutorial/create-an-auto-incrementing-field/

const {validInt, compact, merge, notEmpty, keys, filter, getIn} = require('lib/util')
const {nextSequence} = require('app/config').modules.mongo

function validSequence (value) {
  return validInt(value) && parseInt(value) > 0
}

function sequenceName (space, model, property) {
  return compact([getIn(space, 'dbKey'), model.coll, property]).join('_')
}

function coerceValue (property, value) {
  return property === 'id' ? value.toString() : value
}

async function setSequenceFields (doc, options) {
  const properties = getIn(options, 'model.schema.properties')
  const idSequence = getIn(options, 'model.schema.x-meta.idSequence')
  const sequenceProperties = keys(filter(properties, (p) => getIn(p, 'x-meta.sequence')))
  if (idSequence) sequenceProperties.push('id')
  const sequences = {}
  for (let property of sequenceProperties) {
    const name = sequenceName(options.space, options.model, property)
    const value = doc[property]
    if (validSequence(value)) {
      await nextSequence(name, {value})
      sequences[property] = coerceValue(property, value)
    } else {
      sequences[property] = coerceValue(property, (await nextSequence(name)))
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
