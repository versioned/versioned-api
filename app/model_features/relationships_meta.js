const {notEmpty, merge, updateIn, setIn, getIn, keys, keyValues, filter} = require('lib/util')
const {relationshipProperties, getModel} = require('app/relationships_helper')
const {changes} = require('lib/model_api')
const requireModels = () => require('app/models/models')

function twoWayRelationships (model) {
  return filter(relationshipProperties(model), (property) => {
    const {toType, toField} = getIn(property, 'x-meta.relationship')
    return toType && toField
  })
}

function changedTwoWayRelationships (model, existingDoc, doc) {
  const changedNames = keys(changes(existingDoc, doc))
  return filter(twoWayRelationships(model), (_, name) => {
    return changedNames.includes(name)
  })
}

const TYPES = {
  'one-to-many': 'many-to-one',
  'many-to-one': 'one-to-many',
  'one-to-one': 'one-to-one',
  'many-to-many': 'many-to-many'
}

function isArrayProperty (type) {
  return ['one-to-many', 'many-to-many'].includes(type)
}

function toProperty (fromField, fromType, property) {
  const relationship = getIn(property, 'x-meta.relationship')
  const type = TYPES[relationship.type]
  const xMeta = {
    relationship: {
      toType: fromType,
      toField: fromField,
      type
    }
  }
  if (isArrayProperty(type)) {
    return {
      type: 'array',
      items: {type: 'string'},
      'x-meta': xMeta
    }
  } else {
    return {
      type: 'string',
      'x-meta': xMeta
    }
  }
}

async function updateRelationship (doc, name, property, options) {
  let {fromType, toType, toField} = getIn(property, 'x-meta.relationship')
  fromType = fromType || getIn(options, 'model.type')
  if (!toType || !toField || !fromType) return
  const model = getModel(toType, options.space)
  if (!model) return
  const updatedModel = setIn(model, `model.schema.properties.${name}`, toProperty(name, fromType, property))
  await requireModels().update(model.id, updatedModel, {rejectUnchanged: false})
}

async function setTwoWayRelationships (doc, options) {
  const spaceId = doc.spaceId || getIn(options, 'space.id')
  const modelsInSpace = await requireModels().list({spaceId})
  const relationships = modelsInSpace.reduce((acc, model) => {
    const properties = filter(twoWayRelationships(model.model), (property) => {
      return getIn(property, 'x-meta.relationship.toType') === doc.coll
    })
    const fromType = getIn(model, 'model.type')
    const toProperties = keys(properties).reduce((acc, fromField) => {
      const property = properties[fromField]
      const toField = getIn(property, 'x-meta.relationship.toField')
      acc[toField] = toProperty(fromField, fromType, property)
      return acc
    }, {})
    return merge(acc, toProperties)
  }, {})
  if (notEmpty(relationships)) {
    return updateIn(doc, 'model.schema.properties', (properties) => merge(properties, relationships))
  } else {
    return doc
  }
}

async function updateTwoWayRelationships (doc, options) {
  const {model, existingDoc} = options
  const properties = changedTwoWayRelationships(model, existingDoc, doc)
  for (let [name, property] of keyValues(properties)) {
    await updateRelationship(doc, name, property, options)
  }
  return doc
}

async function deleteTwoWayRelationships (doc, options) {
  // TODO
  return doc
}

const model = {
  callbacks: {
    create: {
      beforeValidation: [setTwoWayRelationships]
    },
    save: {
      afterSave: [updateTwoWayRelationships]
    },
    delete: {
      after: [deleteTwoWayRelationships]
    }
  }
}

module.exports = model
