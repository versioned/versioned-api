const config = require('app/config')
const {logger} = config.modules
const {compact, keys, isArray, groupBy, flatten, first, json, array, keyValues, isObject, getIn, merge, concat, empty} = require('lib/util')
const diff = require('lib/diff')
const {relationshipProperties, getApi} = require('app/relationships_helper')

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

async function fetchRelationshipDocs (docs, name, property, options) {
  const {toType} = getIn(property, 'x-meta.relationship')
  if (!toType) return
  const api = await getApi(toType, options.space)
  if (!api) return
  const ids = flatten(docs.map(doc => array(doc[name]).map(getId)))
  if (empty(ids)) return
  const relationshipDocs = await api.list({id: {$in: ids}})
  return groupBy(relationshipDocs, (doc) => doc.id, {unique: true})
}

async function addRelationships (data, options) {
  const properties = relationshipProperties(options.model)
  if (empty(data) || !getIn(options, ['queryParams', 'relationships']) || empty(properties)) {
    return data
  }
  const docs = array(data)
  const relationshipDocs = {}
  for (let [name, property] of keyValues(properties)) {
    relationshipDocs[name] = await fetchRelationshipDocs(docs, name, property, options)
  }
  const docsWithRelationships = docs.map(doc => {
    const relationships = keys(properties).reduce((acc, name) => {
      const isMany = (getIn(options, `model.schema.properties.${name}.type`, 'array') === 'array')
      const orderedDocs = compact(array(doc[name]).map(v => relationshipDocs[name][getId(v)]))
      acc[name] = isMany ? orderedDocs : first(orderedDocs)
      return acc
    }, {})
    return merge(doc, relationships)
  })
  return isArray(data) ? docsWithRelationships : docsWithRelationships[0]
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
  const api = await getApi(toType, options.space)
  if (!api) return
  const toMany = (getIn(api, `model.schema.properties.${toField}.type`, 'array') === 'array')

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
  for (let [name, property] of keyValues(relationshipProperties(options.model))) {
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
