const config = require('app/config')
const {logger} = config.modules
const {values, property, deepMerge, pick, difference, filter, notEmpty, evolve, compact, keys, isArray, groupBy, flatten, first, json, array, keyValues, isObject, getIn, merge, concat, empty} = require('lib/util')
const diff = require('lib/diff')
const {getId, undeletableRelationships, relationshipProperties, twoWayRelationships, getApi} = require('app/relationships_helper')
const {readableDoc} = require('lib/model_access')
const {validationError} = require('lib/errors')

const PARAMS = [
  {
    name: 'relationshipLevels',
    description: 'How many relationship levels to fetch. Fetches all relationships unless the relationships/graph parameters are provided.',
    in: 'query',
    required: false,
    schema: {
      type: 'integer',
      minimum: 0,
      maximum: 10
    }
  },
  {
    name: 'relationships',
    in: 'query',
    description: 'Which relationships to fetch. Example for users: defaultSpace.models,accounts.spaces.models',
    required: false,
    schema: {
      type: 'array',
      items: {
        type: 'string'
      }
    }
  },
  {
    name: 'graph',
    in: 'query',
    description: 'Which fields/relationships to fetch. The syntax is a limited form of GraphQL. Example for users: {name,defaultSpace{name,models},accounts{name,spaces}}',
    required: false,
    schema: {
      'x-meta': {
        coerce: parseGraph
      },
      type: 'object'
    }
  }
]

function parseGraph (graph) {
  if (typeof graph !== 'string') return graph
  let result = graph
  if (!(result.startsWith('{') && result.endsWith('}'))) {
    result = '{' + result + '}'
  }
  result = result.replace(/\s/g, '')
    .replace(/[^{},]+/g, (match) => `"${match}"`)
    .replace(/"\{/g, '": {')
    .replace(/",/g, '": 1,')
    .replace(/"}/g, '": 1}')
  try {
    return JSON.parse(result)
  } catch (err) {
    logger.error(`Could not JSON.parse graph param err=${err.message}`, graph, err)
    return undefined
  }
}

// NOTE: check relationshipParent so we don't fetch parent document again (the relationship we are coming from)
function isParent (toType, toField, options) {
  const parent = getIn(options, 'relationshipParent')
  return toType === getIn(parent, 'type') && toField === getIn(parent, 'field')
}

function nestedRelationships (name, property, relationships) {
  return compact(relationships.map(path => {
    const relNames = path.split('.')
    const nameMatch = (relNames[0] === name || relNames[0] === getIn(property, 'x-meta.relationship.name'))
    return nameMatch ? relNames.slice(1).join('.') : undefined
  }))
}

function nestedGraph (name, property, graph) {
  return graph[name] || graph[getIn(property, 'x-meta.relationship.name')]
}

async function fetchRelationshipDocs (docs, name, property, options) {
  logger.verbose(`fetchRelationshipDocs name=${name} property=${json(property)} parent=${json(getIn(options, 'relationshipParent'))}`)
  const {toType, toField} = getIn(property, 'x-meta.relationship')
  if (!toType || isParent(toType, toField, options)) return
  const api = await getApi(toType, options.model, options.space)
  if (!api) return
  const ids = flatten(docs.map(doc => array(doc[name]).map(getId)))
  if (empty(ids)) return
  const queryParams = evolve(options.queryParams, {
    relationshipLevels: (n) => n - 1,
    relationships: (r) => nestedRelationships(name, property, r),
    graph: (g) => nestedGraph(name, property, g)
  })
  const relationshipParent = {type: docs[0].type, field: name}
  const listOptions = {queryParams, space: options.space, relationshipParent, user: options.user}
  const query = {id: {$in: ids}}
  const relationshipDocs = (await api.list(query, listOptions)).map(d => readableDoc(api.model, d))
  logger.verbose(`fetchRelationshipDocs name=${name} docs.length=${relationshipDocs.length}`)
  return groupBy(relationshipDocs, (doc) => doc.id, {unique: true})
}

function relationshipNames (model) {
  const properties = getIn(model, 'schema.properties')
  return keys(properties).reduce((acc, name) => {
    const relationshipName = getIn(properties, `${name}.x-meta.relationship.name`)
    if (relationshipName) acc[relationshipName] = name
    return acc
  }, {})
}

function graphToProjection (graph, model) {
  if (empty(graph)) return undefined
  const relToProperty = relationshipNames(model)
  return keys(graph).reduce((acc, name) => {
    const propertyName = relToProperty[name] || name
    acc[propertyName] = 1
    return acc
  }, {})
}

function setGraphProjection (doc, options) {
  const graph = getIn(options, 'queryParams.graph')
  const projection = graphToProjection(graph, options.model)
  if (projection) {
    return deepMerge(doc, {findOptions: {projection}})
  }
}

function propertiesToFetch (options) {
  const levels = getIn(options, 'queryParams.relationshipLevels')
  const paths = getIn(options, 'queryParams.relationships')
  const graph = getIn(options, 'queryParams.graph')
  if (levels === undefined && empty(paths) && empty(graph)) return undefined
  let properties = relationshipProperties(options.model)
  let filterByNames = null
  if (notEmpty(graph)) {
    filterByNames = keys(graph)
  } else if (notEmpty(paths)) {
    filterByNames = paths.map(path => path.split('.')[0])
  }
  if (filterByNames) {
    properties = filter(properties, (property, propertyName) => {
      const relationshipName = getIn(property, 'x-meta.relationship.name')
      return filterByNames.includes(propertyName) || filterByNames.includes(relationshipName)
    })
  }
  return (levels === undefined || levels > 0) ? properties : undefined
}

async function fetchAllRelationships (data, options) {
  const properties = propertiesToFetch(options)
  if (empty(data) || empty(properties)) return data
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
        return typeof v === 'object' ? merge(v, doc) : doc
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
      parameters: concat(route.parameters, PARAMS)
    })
  } else {
    return route
  }
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
  const api = await getApi(toType, options.model, options.space)
  if (!api) return
  const toMany = (getIn(api, `model.schema.properties.${toField}.type`, 'array') === 'array')
  const toRequired = getIn(api, `model.schema.required`, []).includes(toField)
  const toCascade = (getIn(api, `model.schema.properties.${toField}.x-meta.relationship.onDelete`) === 'cascade')

  const existingValues = getIn(options, ['existingDoc', name])
  const {added, removed, changed} = relationshipDiff(existingValues, doc[name])

  logger.verbose(`updateRelationship ${options.model.type}.${name} -> ${toType}.${toField} toMany=${toMany} added=${json(added)} removed=${json(removed)} changed=${json(changed)}`)

  const skipCallbacks = ['updateAllRelationships', 'checkAccess', 'validateRelationshipIds']
  const apiOptions = {skipCallbacks, user: options.user, space: options.space}
  for (let fromValue of added) {
    const toValue = makeToValue(fromValue, doc.id)
    const addValue = (values) => toMany ? concat(values, [toValue]) : toValue
    await api.update(getId(fromValue), {}, merge(apiOptions, {evolve: {[toField]: addValue}}))
  }
  for (let fromValue of removed) {
    const removeValue = (values) => toMany ? values.filter(v => getId(v) !== doc.id) : undefined
    if (!toMany && toRequired && toCascade) {
      await api.delete(getId(fromValue), apiOptions)
    } else {
      await api.update(getId(fromValue), {}, merge(apiOptions, {evolve: {[toField]: removeValue}}))
    }
  }
  for (let fromValue of changed) {
    const updateValue = (values) => {
      if (toMany) {
        return values.map(v => getId(v) === doc.id ? updateToValue(v, fromValue) : v)
      } else {
        return updateToValue(values, fromValue)
      }
    }
    await api.update(getId(fromValue), {}, merge(apiOptions, {evolve: {[toField]: updateValue}}))
  }
}

async function validateRelationshipIds (doc, options) {
  const properties = filter(relationshipProperties(options.model), (property, name) => notEmpty(doc[name]))
  for (let [name, property] of keyValues(properties)) {
    const ids = array(doc[name]).map(getId)
    const {toType} = getIn(property, 'x-meta.relationship')
    const api = await getApi(toType, options.model, options.space)
    if (api) {
      const query = {id: {$in: ids}}
      const listOptions = {limit: ids.length, projection: {id: 1}, user: options.user}
      const foundIds = (await api.list(query, listOptions)).map(d => d.id)
      const invalidIds = difference(ids, foundIds)
      if (notEmpty(invalidIds)) {
        throw validationError(options.model, doc, `contains the following invalid ids: ${invalidIds.join(', ')}`, name)
      }
    }
  }
}

async function updateAllRelationships (doc, options) {
  for (let [name, property] of keyValues(twoWayRelationships(options.model))) {
    await updateRelationship(doc, name, property, options)
  }
  return doc
}

async function checkCanDelete (doc, options) {
  const undeletable = await undeletableRelationships(doc, options.model, options.space, options.mongo)
  if (notEmpty(undeletable)) {
    logger.info(`checkCanDelete rejected delete for ${options.model.coll}.${doc.id} undeletable=${json(undeletable)}`)
    const relNames = flatten(values(undeletable)).map(property('name'))
    throw validationError(options.model, doc, `Cannot be deleted due to the following relationships: ${relNames.join(', ')}`)
  }
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
      before: [checkCanDelete, deleteAllRelationships]
    },
    list: {
      before: [setGraphProjection],
      after: [fetchAllRelationships]
    },
    get: {
      before: [setGraphProjection],
      after: [fetchAllRelationships]
    },
    routeCreate: {
      after: [addRouteParameters]
    }
  }
}

module.exports = model
