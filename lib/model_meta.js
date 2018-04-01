const {getIn, keys} = require('lib/util')

function properties (model) {
  return getIn(model, ['schema', 'properties'])
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

module.exports = {
  properties,
  getPropertyMeta,
  idProperty,
  idType
}
