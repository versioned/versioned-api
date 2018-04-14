const {merge, getIn, keys} = require('lib/util')

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
  return properties(model)[idProperty(model)].type
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

module.exports = {
  properties,
  hasProperty,
  getPropertyMeta,
  idProperty,
  idType,
  getId,
  withId
}
