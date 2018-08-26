const {isObject, array, empty, compact, filter, getIn, keyValues} = require('lib/util')
const requireModels = () => require('app/models/models')
const requireSpaces = () => require('app/models/spaces')

// NOTE: a relationship value is either an object with an id property or a string id
function getId (value) {
  return isObject(value) ? getIn(value, 'id') : value
}

function relationshipProperties (model) {
  return filter(getIn(model, 'schema.properties'), (p) => {
    return getIn(p, 'x-meta.relationship')
  })
}

function isTwoWayRelationship (property) {
  const {toType, toField} = getIn(property, 'x-meta.relationship', {})
  return toType && toField
}

function twoWayRelationships (model) {
  return filter(relationshipProperties(model), isTwoWayRelationship)
}

async function canDelete (doc, model, space, mongo) {
  return empty(await undeletableRelationships(doc, model, space))
}

async function undeletableRelationships (doc, model, space, mongo) {
  const result = {cannotCascade: [], missingCascade: []}
  for (let [name, property] of keyValues(twoWayRelationships(model))) {
    const toIds = array(doc[name]).map(getId)
    const toType = getIn(property, 'x-meta.relationship.toType')
    const toField = getIn(property, 'x-meta.relationship.toField')
    const toApi = await getApi(toType, model, space)
    if (toApi && !empty(toIds)) {
      const toModel = toApi.model
      const required = getIn(toModel, `schema.required`, []).includes(toField)
      const cascade = (getIn(toModel, `schema.properties.${toField}.x-meta.relationship.onDelete`) === 'cascade')
      const relType = getIn(property, 'x-meta.relationship.type')
      const constrainedType = ['one-to-many', 'one-to-one'].includes(relType)
      if (constrainedType && required) {
        if (cascade) {
          const toDocs = await toApi.list({id: {$in: toIds}})
          for (let toDoc of toDocs) {
            const canDeleteTarget = await canDelete(toDoc, toModel, space, mongo)
            if (!canDeleteTarget) {
              result.cannotCascade.push({name, toType, relType, toField, toDoc})
              break
            }
          }
        } else {
          result.missingCascade.push({name, toType, relType, toField})
        }
      }
    }
  }
  return empty(compact(result)) ? undefined : result
}

function getStaticApi (toType) {
  return require(`app/models/${toType}`)
}

async function getModelsApi (space) {
  return requireSpaces().getApi(space, requireModels().model)
}

async function getDataModel (toType, space) {
  if (!toType || !space) return undefined
  const models = await getModelsApi(space)
  return models.get({spaceId: space.id, 'model.type': toType})
}

async function getApi (toType, model, space) {
  if (getIn(model, 'schema.x-meta.dataModel')) {
    const model = await getDataModel(toType, space)
    if (!model) return undefined
    return requireModels().getApi(space, model)
  } else {
    return getStaticApi(toType)
  }
}

module.exports = {
  getId,
  relationshipProperties,
  isTwoWayRelationship,
  twoWayRelationships,
  canDelete,
  undeletableRelationships,
  getModelsApi,
  getDataModel,
  getApi
}
