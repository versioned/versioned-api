const config = require('app/config')
const {logger} = config.modules
const {pick, difference, filter, notEmpty, updateIn, compact, keys, isArray, groupBy, flatten, first, json, array, keyValues, isObject, getIn, merge, concat, empty} = require('lib/util')
const diff = require('lib/diff')
const {relationshipProperties, getApi} = require('app/relationships_helper')
const {readableDoc} = require('lib/model_access')
const {validationError} = require('lib/errors')

const PARAMS = {
  relationships: {
    name: 'relationships',
    in: 'query',
    required: false,
    schema: {
      type: 'integer',
      minimum: 1,
      maximum: 10
    }
  }
}

// NOTE: check relationshipParent so we don't fetch parent document again (the relationship we are coming from)
function isParent (toType, toField, options) {
  const parent = getIn(options, 'relationshipParent')
  return toType === getIn(parent, 'type') && toField === getIn(parent, 'field')
}

async function fetchRelationshipDocs (docs, name, property, options) {
  const {toType, toField} = getIn(property, 'x-meta.relationship')
  if (!toType || isParent(toType, toField, options)) return
  const api = await getApi(toType, options.space)
  if (!api) return
  const ids = flatten(docs.map(doc => array(doc[name]).map(getId)))
  if (empty(ids)) return
  const queryParams = updateIn(options.queryParams, 'relationships', (n) => n - 1)
  const relationshipParent = {type: docs[0].type, field: name}
  const listOptions = {queryParams, space: options.space, relationshipParent}
  const relationshipDocs = (await api.list({id: {$in: ids}}, listOptions)).map(d => readableDoc(api.model, d))
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
      const orderedDocs = compact(array(doc[name]).map(v => {
        const doc = getIn(relationshipDocs[name], getId(v))
        return typeof v === 'object' ? merge(doc, v) : doc
      }))
      const relationshipName = getIn(properties, `${name}.x-meta.relationship.name`, name)
      if (notEmpty(orderedDocs)) {
        acc[relationshipName] = isMany ? orderedDocs : first(orderedDocs)
      } else {
        acc[relationshipName] = undefined
      }
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

  const skipCallbacks = ['updateAllRelationships', 'checkAccess', 'validateRelationshipIds']
  for (let fromValue of added) {
    const toValue = makeToValue(fromValue, doc.id)
    const addValue = (values) => toMany ? concat(values, [toValue]) : toValue
    await api.update(getId(fromValue), {}, {skipCallbacks, evolve: {[toField]: addValue}})
  }
  for (let fromValue of removed) {
    const removeValue = (values) => toMany ? values.filter(v => getId(v) !== doc.id) : undefined
    await api.update(getId(fromValue), {}, {skipCallbacks, evolve: {[toField]: removeValue}})
  }
  for (let fromValue of changed) {
    const updateValue = (values) => {
      if (toMany) {
        return values.map(v => getId(v) === doc.id ? updateToValue(v, fromValue) : v)
      } else {
        return updateToValue(values, fromValue)
      }
    }
    await api.update(getId(fromValue), {}, {skipCallbacks, evolve: {[toField]: updateValue}})
  }
}

async function validateRelationshipIds (doc, options) {
  const properties = filter(relationshipProperties(options.model), (property, name) => notEmpty(doc[name]))
  for (let [name, property] of keyValues(properties)) {
    const ids = array(doc[name]).map(getId)
    const {toType} = getIn(property, 'x-meta.relationship')
    const api = await getApi(toType, options.space)
    if (api) {
      const foundIds = (await api.list({id: {$in: ids}}, {limit: ids.length, projection: {id: 1}})).map(d => d.id)
      const invalidIds = difference(ids, foundIds)
      if (notEmpty(invalidIds)) {
        throw validationError(options.model, doc, `The ${name} relationship has the following invalid ids: ${invalidIds.join(', ')}`)
      }
    }
  }
}

async function updateAllRelationships (doc, options) {
  for (let [name, property] of keyValues(relationshipProperties(options.model))) {
    await updateRelationship(doc, name, property, options)
  }
  return doc
}

async function deleteAllRelationships (doc, options) {
  const toDoc = pick(doc, ['id', 'type'])
  await updateAllRelationships(toDoc, merge(options, {existingDoc: doc}))
  return doc
}

const model = {
  callbacks: {
    save: {
      afterValidation: [validateRelationshipIds],
      afterSave: [updateAllRelationships]
    },
    delete: {
      before: [deleteAllRelationships]
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
