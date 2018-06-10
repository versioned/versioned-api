const {first, filter, find, merge, getIn, keys} = require('lib/util')

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

function titleProperty (model) {
  const propertyNames = getIn(model, 'schema.x-meta.propertiesOrder', keys(properties(model)))
  const typicalNames = ['title', 'name']
  const isStringProperty = (name) => getIn(model, `schema.properties.${name}.type`) === 'string'
  return getIn(model, 'schema.x-meta.titleProperty') ||
    find(typicalNames, name => propertyNames.includes(name)) ||
    first(filter(propertyNames, isStringProperty))
}

module.exports = {
  properties,
  hasProperty,
  getPropertyMeta,
  idProperty,
  idType,
  getId,
  withId,
  titleProperty
}
