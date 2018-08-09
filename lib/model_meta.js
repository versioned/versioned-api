const {first, filter, find, merge, getIn, keys, empty, difference} = require('lib/util')

function properties (model) {
  return getIn(model, ['schema', 'properties'])
}

function hasProperty (model, property) {
  return keys(properties(model)).includes(property)
}

function getPropertyMeta (model, property) {
  return getIn(properties(model), [property, 'x-meta'], {})
}

function idProperty (model) {
  return keys(properties(model)).find(property => {
    return getPropertyMeta(model, property)['id']
  }) || '_id'
}

function idType (model) {
  const property = properties(model)[idProperty(model)]
  return property ? property.type : 'string'
}

function getId (model, doc) {
  return doc && doc[idProperty(model)]
}

function withId (model, doc) {
  return merge(doc, {
    _id: undefined,
    id: getId(model, doc)
  })
}

// NOTE: want keys ordered but unfortunately can't rely on models.propertiesOrder being up-to-date
function propertiesOrder (schema) {
  const properties = getIn(schema, 'properties')
  if (empty(properties)) return []
  const allKeys = Object.keys(properties)
  const orderedKeys = getIn(schema, 'x-meta.propertiesOrder', []).filter(key => allKeys.includes(key))
  const missingKeys = difference(allKeys, orderedKeys)
  return orderedKeys.concat(missingKeys)
}

function titleProperty (model) {
  const propertyNames = propertiesOrder(getIn(model, 'schema'))
  const typicalNames = ['title', 'name']
  const isStringProperty = (name) => getIn(model, `schema.properties.${name}.type`) === 'string'
  const customProperty = getIn(model, 'schema.x-meta.titleProperty')
  const defaultProperty = find(typicalNames, name => propertyNames.includes(name)) ||
                          first(filter(propertyNames, isStringProperty))
  return propertyNames.includes(customProperty) ? customProperty : defaultProperty
}

module.exports = {
  properties,
  hasProperty,
  getPropertyMeta,
  idProperty,
  idType,
  getId,
  withId,
  propertiesOrder,
  titleProperty
}
