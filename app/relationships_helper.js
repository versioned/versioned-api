const {filter, getIn} = require('lib/util')
const requireModels = () => require('app/models/models')

function relationshipProperties (model) {
  return filter(getIn(model, 'schema.properties'), (p) => {
    return getIn(p, 'x-meta.relationship')
  })
}

function isTwoWayRelationship (property) {
  const {toType, toField, oneWay} = getIn(property, 'x-meta.relationship', {})
  return toType && toField && oneWay !== true
}

function twoWayRelationships (model) {
  return filter(relationshipProperties(model), isTwoWayRelationship)
}

function getStaticApi (toType) {
  return require(`app/models/${toType}`)
}

async function getSpaceModel (toType, spaceId) {
  if (!toType || !spaceId) return undefined
  return requireModels().get({spaceId, 'model.type': toType})
}

async function getApi (toType, space) {
  if (space) {
    const model = await getSpaceModel(toType, getIn(space, 'id'))
    if (!model) return undefined
    return requireModels().getApi(space, model)
  } else {
    return getStaticApi(toType)
  }
}

module.exports = {
  relationshipProperties,
  isTwoWayRelationship,
  twoWayRelationships,
  getSpaceModel,
  getApi
}
