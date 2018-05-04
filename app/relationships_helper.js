const {filter, getIn} = require('lib/util')
const requireModels = () => require('app/models/models')

function relationshipProperties (model) {
  return filter(getIn(model, 'schema.properties'), (p) => {
    return getIn(p, 'x-meta.relationship')
  })
}

async function getModel (toType, spaceId) {
  if (!toType || !spaceId) return undefined
  return requireModels().get({spaceId, 'model.type': toType})
}

async function getApi (toType, space) {
  const model = await getModel(toType, space.id)
  if (!model) return undefined
  return requireModels().getApi(space, model)
}

module.exports = {
  relationshipProperties,
  getModel,
  getApi
}
