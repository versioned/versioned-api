const config = require('app/config')
const {logger} = config.modules
const {first, compact, notEmpty, json, array, keyValues, isObject, getIn, filter, merge, concat, empty, isArray} = require('lib/util')
const diff = require('lib/diff')
const models = require('app/models/models')

const PARAMS = {
  relationships: {
    name: 'relationships',
    in: 'query',
    required: false,
    schema: {
      type: 'boolean'
    }
  }
}

function relationshipProperties (doc, options) {
  return filter(getIn(options, 'model.schema.properties'), (p) => {
    return getIn(p, 'x-meta.relationship')
  })
}

async function fetchRelationship (doc, name, property, options) {
  const isMany = (getIn(options, `model.schema.properties.${name}.type`, 'array') === 'array')
  const {toType} = getIn(property, 'x-meta.relationship')
  if (!toType) return
  const spaceId = getIn(options, 'space.id')
  const model = await models.get({spaceId, 'model.type': toType})
  if (!model) return
  const api = await models.getApi(options.space, model)
  const ids = array(doc[name]).map(getId)
  if (empty(ids)) return
  const docs = await api.list({id: {$in: ids}})
  const orderedDocs = compact(ids.map(id => docs.find(doc => doc.id === id)))
  return isMany ? orderedDocs : first(orderedDocs)
}

async function docWithRelationships (doc, options) {
  const properties = relationshipProperties(doc, options)
  if (getIn(options, ['queryParams', 'relationships']) && notEmpty(properties)) {
    const relationships = {}
    for (let [name, property] of keyValues(properties)) {
      relationships[name] = await fetchRelationship(doc, name, property, options)
    }
    return merge(doc, relationships)
  } else {
    return doc
  }
}

async function addRelationships (data, options) {
  if (empty(data)) {
    return data
  } else if (isArray(data)) {
    const result = []
    for (let doc of data) {
      result.push(await docWithRelationships(doc, options))
    }
    return result
  } else {
    return docWithRelationships(data, options)
  }
}

function addRouteParameters (route) {
  if (['list', 'get'].includes(route.action)) {
    return merge(route, {
      parameters: concat(route.parameters, [PARAMS.relationships])
    })
  } else {
    return route
  }
}

// NOTE: a relationship value is either an object with an id property or a string id
function getId (value) {
  return isObject(value) ? getIn(value, 'id') : value
}

function makeToValue (fromValue, id) {
  return isObject(fromValue) ? merge(fromValue, {id}) : id
}

function updateToValue (toValue, fromValue) {
  return isObject(toValue) ? merge(fromValue, {id: toValue.id}) : toValue
}

function relationshipDiff (from, to) {
  from = array(from)
  to = array(to)
  if (empty(from)) return {added: to, removed: [], changed: []}
  const added = to.filter(r => !from.map(getId).includes(getId(r)))
  const removed = from.filter(r => !to.map(getId).includes(getId(r)))
  const changed = to.filter(toValue => {
    const fromValue = from.find(r => getId(r) === getId(toValue))
    return fromValue && diff(fromValue, toValue)
  })
  return {added, removed, changed}
}

async function updateRelationship (doc, name, property, options) {
  const {toType, toField} = getIn(property, 'x-meta.relationship')
  if (!toField) return
  const spaceId = getIn(options, 'space.id')
  const model = await models.get({spaceId, 'model.type': toType})
  if (!model) return
  const toMany = (getIn(model, `schema.properties.${toField}.type`, 'array') === 'array')
  const api = await models.getApi(options.space, model)

  const existingValues = getIn(options, ['existingDoc', name])
  const {added, removed, changed} = relationshipDiff(existingValues, doc[name])

  logger.verbose(`updateRelationship ${options.model.type}.${name} -> ${toType}.${toField} toMany=${toMany} added=${json(added)} removed=${json(removed)} changed=${json(changed)}`)

  for (let fromValue of added) {
    const toValue = makeToValue(fromValue, doc.id)
    const addValue = (values) => toMany ? concat(values, [toValue]) : toValue
    await api.update(getId(fromValue), {}, {callbacks: false, evolve: {[toField]: addValue}})
  }
  for (let fromValue of removed) {
    const removeValue = (values) => toMany ? values.filter(v => getId(v) !== doc.id) : undefined
    await api.update(getId(fromValue), {}, {callbacks: false, evolve: {[toField]: removeValue}})
  }
  for (let fromValue of changed) {
    const updateValue = (values) => {
      if (toMany) {
        return values.map(v => getId(v) === doc.id ? updateToValue(v, fromValue) : v)
      } else {
        return updateToValue(values, fromValue)
      }
    }
    await api.update(getId(fromValue), {}, {callbacks: false, evolve: {[toField]: updateValue}})
  }
}

async function updateAllRelationships (doc, options) {
  for (let [name, property] of keyValues(relationshipProperties(doc, options))) {
    await updateRelationship(doc, name, property, options)
  }
  return doc
}

const model = {
  callbacks: {
    save: {
      afterSave: [updateAllRelationships]
    },
    list: {
      after: [addRelationships]
    },
    get: {
      after: [addRelationships]
    },
    routeCreate: {
      after: [addRouteParameters]
    }
  }
}

module.exports = model
