// See: https://docs.mongodb.com/v3.0/tutorial/create-an-auto-incrementing-field/

const {notNil, validInt, compact, merge, notEmpty, keys, filter, getIn} = require('lib/util')
const {nextSequence} = require('app/config').modules.mongo
const {validationError} = require('lib/errors')

function validSequence (value) {
  return validInt(value) && parseInt(value) > 0
}

function sequenceName (space, model, property) {
  return compact([getIn(space, 'dbKey'), model.coll, property]).join('_')
}

function sequenceProperties (model) {
  const idSequence = getIn(model, 'schema.x-meta.idSequence')
  const properties = keys(filter(getIn(model, 'schema.properties'), (p) => getIn(p, 'x-meta.sequence')))
  if (idSequence) properties.push('id')
  return properties
}

function coerceValue (property, value) {
  return property === 'id' ? value.toString() : value
}

function validateSequenceFields (doc, options) {
  for (let property of sequenceProperties(options.model)) {
    const value = doc[property]
    if (notNil(value) && !validSequence(value)) {
      throw validationError(options.model, doc, `is not a valid integer sequence (1, 2, 3...)`, property)
    }
  }
}

async function setSequenceFields (doc, options) {
  const sequences = {}
  for (let property of sequenceProperties(options.model)) {
    const name = sequenceName(options.space, options.model, property)
    const value = doc[property]
    if (validSequence(value)) {
      await nextSequence(name, {value})
      sequences[property] = coerceValue(property, value)
    } else {
      sequences[property] = coerceValue(property, (await nextSequence(name)))
    }
  }
  if (notEmpty(sequences)) {
    return merge(doc, sequences)
  }
}

const model = {
  callbacks: {
    create: {
      beforeValidation: [validateSequenceFields, setSequenceFields]
    }
  }
}

module.exports = model
