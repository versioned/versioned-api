const {isObject, array, empty, compact, filter, getIn, flatten, keyValues, setIn, uniqueBy} = require('lib/util')
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

function nestedRelationshipProperties (schema, path = []) {
  const properties = getIn(schema, 'properties') || getIn(schema, 'items.properties')
  if (!properties) return []
  return compact(flatten(keyValues(properties).map(([key, property]) => {
    const nestedPath = [...path, key]
    if (getIn(property, 'x-meta.relationship')) {
      return { path: nestedPath, property }
    } else if (['object', 'array'].includes(property.type)) {
      return nestedRelationshipProperties(property, nestedPath)
    }
  })))
}

function nestedRelationshipRefs (doc, path, {valuePath = []} = {}) {
  if (!doc) return []
  if (empty(path)) return [{path: valuePath, value: array(doc)}]
  const [key, ...nestedPath] = path
  const value = doc[key]
  if (Array.isArray(value) && nestedPath.length > 0) {
    return flatten(compact(value.map((v, index) => {
      return nestedRelationshipRefs(v, nestedPath, {valuePath: [...valuePath, key, index]})
    })))
  } else {
    return nestedRelationshipRefs(value, nestedPath, {valuePath: [...valuePath, key]})
  }
}

function nestedRelationshipValues (doc, path) {
  return flatten(nestedRelationshipRefs(doc, path).map(r => r.value))
}

function isTwoWayRelationship (property) {
  const {toTypes, toField} = getIn(property, 'x-meta.relationship', {})
  return toTypes && toTypes.length === 1 && toField
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
    const toType = getIn(property, 'x-meta.relationship.toTypes.0')
    const toField = getIn(property, 'x-meta.relationship.toField')
    const toApi = await getToApi(toType, property, model, space)
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

async function getToApi (toType, property, model, space) {
  // NOTE: this is a bit unclear but the assumption here is that a writable relationship in
  // a data model (i.e. a dynamic model stored in the database) is always to another data model.
  // An example of a non writable relationship in a data model is createdBy/updatedBy which are
  // relationships to the built in users model.
  if (getIn(model, 'schema.x-meta.dataModel') && getIn(property, 'x-meta.writable') !== false) {
    const model = await getDataModel(toType, space)
    if (!model) return undefined
    return requireModels().getApi(space, model)
  } else {
    return getStaticApi(toType)
  }
}

function makeUnique (doc, options) {
  let result = doc
  for (const {path, property} of nestedRelationshipProperties(options.model.schema)) {
    if (getIn(property, 'x-meta.relationship.type') === 'one-to-many') {
      for (const {path: valuePath, value: values} of nestedRelationshipRefs(doc, path)) {
        const uniqueValues = uniqueBy(values, getId)
        if (values && uniqueValues.length < values.length) {
          result = setIn(result, valuePath, uniqueValues)
        }
      }
    }
  }
  return result
}

module.exports = {
  getId,
  relationshipProperties,
  nestedRelationshipProperties,
  nestedRelationshipRefs,
  nestedRelationshipValues,
  isTwoWayRelationship,
  twoWayRelationships,
  canDelete,
  undeletableRelationships,
  getModelsApi,
  getDataModel,
  getToApi,
  makeUnique
}
