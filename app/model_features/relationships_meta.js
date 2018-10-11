const {first, compact, json, pick, last, notEmpty, merge, updateIn, setIn, getIn, keys, keyValues, filter} = require('lib/util')
const {getModelsApi, isTwoWayRelationship, twoWayRelationships, getDataModel} = require('app/relationships_helper')
const {changes} = require('lib/model_api')
const {logger} = require('app/config').modules

function twoWayRelationshipChanges (existingDoc, doc) {
  const emptyModel = {model: {schema: {properties: {}}}}
  return keys(changes(existingDoc || emptyModel, doc)).reduce((acc, path) => {
    const match = path.match(/model\.schema\.properties\.([^.]+)/)
    if (match) {
      const property = match[1]
      const propertyPath = `model.schema.properties.${property}`
      const fromValue = getIn(existingDoc, propertyPath)
      const toValue = getIn(doc, propertyPath)
      if (isTwoWayRelationship(fromValue) || isTwoWayRelationship(toValue)) {
        if (fromValue && toValue) {
          acc[propertyPath] = {changed: {from: fromValue, to: toValue}}
        } else if (!fromValue && toValue) {
          acc[propertyPath] = {added: toValue}
        } else if (fromValue && !toValue) {
          acc[propertyPath] = {deleted: fromValue}
        }
      }
    }
    return acc
  }, {})
}

const TYPES = {
  'one-to-one': 'one-to-one',
  'one-to-many': 'many-to-one',
  'many-to-one': 'one-to-many',
  'many-to-many': 'many-to-many'
}

function isArrayProperty (type) {
  return ['one-to-many', 'many-to-many'].includes(type)
}

function toProperty (fromField, fromType, property) {
  const relationship = getIn(property, 'x-meta.relationship')
  const type = TYPES[relationship.type]
  const schema = property.items || pick(property, ['type'])
  const xMeta = compact({
    relationship: {
      toTypes: [fromType],
      toField: fromField,
      type
    }
  })
  if (isArrayProperty(type)) {
    return {
      type: 'array',
      items: schema,
      'x-meta': xMeta
    }
  } else {
    return merge(schema, {
      'x-meta': xMeta
    })
  }
}

async function updateRelationship (doc, path, change, options) {
  const name = last(path.split('.'))
  const property = change.added || change.deleted || getIn(change, 'changed.to')
  let {toTypes, toField} = getIn(property, 'x-meta.relationship')
  const toType = first(toTypes)
  const fromType = getIn(doc, 'model.type')
  if (!toType || !toField || !fromType || !doc.spaceId) {
    logger.info(`relationships_meta.updateRelationship - cannot update, missing fields totype=${toType} toField=${toField} fromType=${fromType} spaceId=${doc.spaceId}`)
    return
  }
  const model = await getDataModel(toType, options.space)
  if (!model) return
  const updatedProperty = change.deleted ? null : toProperty(name, fromType, property)
  const updatedModel = setIn(model.model, `schema.properties.${toField}`, updatedProperty)
  const skipCallbacks = ['updateTwoWayRelationships']
  const updateOptions = merge(options, {skipCallbacks, rejectUnchanged: false})
  const models = await getModelsApi(options.space)
  return models.update(model.id, {model: updatedModel}, updateOptions)
}

async function setTwoWayRelationships (doc, options) {
  const spaceId = doc.spaceId
  if (!spaceId) return
  const models = await getModelsApi(options.space)
  const modelsInSpace = await models.list({spaceId})
  const relationships = modelsInSpace.reduce((acc, model) => {
    const properties = filter(twoWayRelationships(model.model), (property) => {
      return getIn(property, 'x-meta.relationship.toTypes.0') === doc.coll
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
  const {existingDoc} = options
  const changes = twoWayRelationshipChanges(existingDoc, doc)
  logger.verbose(`relationships_meta.updateTwoWayRelationships changes=${json(changes)}`)
  for (let [path, change] of keyValues(changes)) {
    await updateRelationship(doc, path, change, options)
  }
  return doc
}

async function deleteTwoWayRelationships (doc, options) {
  const toDoc = setIn(doc, 'model.schema.properties', {})
  await updateTwoWayRelationships(toDoc, merge(options, {existingDoc: doc}))
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
