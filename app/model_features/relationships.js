const config = require('app/config')
const {logger} = config.modules
const {omit, values, property, deepMerge, pick, difference, filter, notEmpty, evolve, compact, keys, isArray, groupBy, flatten, first, json, array, keyValues, isObject, getIn, setIn, merge, concat, empty, last, unique} = require('lib/util')
const diff = require('lib/diff')
const {getId, undeletableRelationships, relationshipProperties, nestedRelationshipProperties, nestedRelationshipRefs, nestedRelationshipValues, twoWayRelationships, getToApi} = require('app/relationships_helper')
const {readableDoc} = require('lib/model_access')
const {validationError} = require('lib/errors')
const {schemaPath} = require('lib/json_schema')

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
    name: 'relationshipParams',
    description: 'Sets skip, limit, sort, and filter query params for relationships to be fetched. Needs to be on JSON format. Example: {"accounts": {"limit": 5}, "accounts.spaces": {"limit": 10, "filter.name[ne]": "Unwanted Space"}}',
    in: 'query',
    required: false,
    schema: {
      'x-meta': {
        coerce: parseRelationshipParams
      },
      type: 'object'
    }
  },
  {
    name: 'graph',
    in: 'query',
    description: 'Which fields/relationships to fetch. The syntax is a limited form of GraphQL. The graph parameter is a more powerful alternative to the relationships parameter. Example for users: {name,defaultSpace{name,models},accounts{name,spaces}}',
    required: false,
    schema: {
      'x-meta': {
        coerce: parseGraph
      },
      type: 'object'
    }
  }
]

function getType (relDoc, property) {
  const defaultType = getIn(property, 'x-meta.relationship.toTypes.0')
  return getIn(relDoc, 'type', defaultType)
}

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

function parseRelationshipParams (params) {
  if (empty(params)) return params
  try {
    return JSON.parse(params)
  } catch (error) {
    return params
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

function nestedRelationshipParams (name, relationshipParams) {
  return compact(keyValues(relationshipParams).reduce((acc, [path, params]) => {
    const prefix = `${name}.`
    if (path.startsWith(prefix)) {
      const nestedPath = compact(path.substring(prefix.length))
      if (nestedPath) acc[nestedPath] = params
    }
    return acc
  }, {}))
}

function nestedGraph (name, property, graph) {
  return graph[name] || graph[getIn(property, 'x-meta.relationship.name')]
}

async function fetchRelationshipDocs (docs, path, property, options) {
  if (empty(array(docs))) return
  const docsByType = groupBy(flatten(docs.map(doc => nestedRelationshipValues(doc, path))), (doc) => getType(doc, property))
  const result = {}
  const fromType = docs[0].type
  for (let [toType, docsForType] of keyValues(docsByType)) {
    result[toType] = await fetchRelationshipDocsForType(fromType, toType, docsForType, path, property, options)
  }
  return result
}

function isValidRelationshipParam (value, key) {
  return (['skip', 'limit'].includes(key) && typeof value === 'number') ||
    (key === 'sort' && typeof value === 'string') ||
    (key.startsWith('filter.') && typeof value === 'string')
}

function relationshipQueryParams (name, property, options) {
  const transforms = {
    relationshipLevels: (n) => n - 1,
    relationships: (r) => nestedRelationships(name, property, r),
    relationshipParams: (r) => nestedRelationshipParams(name, r),
    graph: (g) => nestedGraph(name, property, g)
  }
  const metaParams = evolve(pick(options.queryParams, keys(transforms)), transforms)
  const relParams = filter(getIn(options, `queryParams.relationshipParams.${name}`), isValidRelationshipParam)
  const inheritedParams = pick(getIn(options, 'queryParams'), ['published'])
  return compact([metaParams, relParams, inheritedParams].reduce(merge))
}

async function fetchRelationshipDocsForType (fromType, toType, docs, path, property, options) {
  logger.verbose(`fetchRelationshipDocsForType fromType=${fromType} toType=${toType} path=${path.join('.')} property=${json(property)} parent=${json(getIn(options, 'relationshipParent'))} options.queryParams=${json(options.queryParams)}`)
  if (!toType) return
  const api = await getToApi(toType, property, options.model, options.space)
  if (!api) return
  const ids = unique(docs.map(getId))
  if (empty(ids)) return
  const queryParams = relationshipQueryParams(last(path), property, options)
  const relationshipParent = {type: fromType, field: last(path)}
  const listOptions = merge({queryParams, space: options.space, relationshipParent, user: options.user}, queryParams)
  const query = {id: {$in: ids}}
  const relationshipDocs = (await api.list(query, listOptions)).map(d => readableDoc(api.model, d))
  logger.verbose(`fetchRelationshipDocsForType fromType=${fromType} toType=${toType} path=${path.join('.')} docs.length=${relationshipDocs.length}`)
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

function propertiesToFetch (data, options) {
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
  properties = filter(properties, (property, propertyName) => {
    const {toTypes, toField} = getIn(property, 'x-meta.relationship')
    const toType = first(toTypes)
    if (toType && toField && isParent(toType, toField, options)) {
      logger.verbose(`propertiesToFetch type=${getIn(options, 'model.type')} parent=${json(getIn(options, 'relationshipParent'))} - skipping isParent=${isParent(toType, toField, options)}`)
      return false
    } else if (Array.isArray(data) && getIn(property, 'x-meta.relationship.listFetch') === false) {
      return false
    } else {
      return true
    }
  })
  return (levels === undefined || levels > 0) ? properties : undefined
}

async function fetchAllRelationships (data, options) {
  const properties = propertiesToFetch(data, options)
  logger.verbose(`fetchAllRelationships type=${getIn(options, 'model.type')} parent=${json(getIn(options, 'relationshipParent'))} options.queryParams=${json(options.queryParams)} keys(properties)=${keys(properties)}`)
  if (empty(data) || empty(properties)) return data
  const docs = array(data)
  const relationshipDocs = {}
  for (let [name, property] of keyValues(properties)) {
    relationshipDocs[name] = await fetchRelationshipDocs(docs, [name], property, options)
  }
  const docsWithRelationships = docs.map(doc => {
    const relationships = keys(properties).reduce((acc, name) => {
      const isMany = (getIn(options, `model.schema.properties.${name}.type`, 'array') === 'array')
      const orderedDocs = compact(array(doc[name]).map(v => {
        const type = getType(v, properties[name])
        const doc = getIn(relationshipDocs[name], [type, getId(v)])
        if (doc) {
          return typeof v === 'object' ? merge(v, doc) : doc
        } else {
          return undefined
        }
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

async function fetchAllNestedRelationships (data, options) {
  if (getIn(options, 'queryParams.relationshipLevels', 0) < 1) return data
  const shouldFetchProperty = ({path}) => {
    if (path.length <= 1) return false
    const schema = getIn(options, 'model.schema')
    const listFetch = getIn(schema, [...schemaPath(path, schema), 'x-meta', 'relationship', 'listFetch'])
    if (isArray(data) && listFetch === false) return false
    return true
  }
  const properties = nestedRelationshipProperties(options.model.schema).filter(shouldFetchProperty)
  logger.verbose(`fetchAllNestedRelationships type=${getIn(options, 'model.type')} parent=${json(getIn(options, 'relationshipParent'))} options.queryParams=${json(options.queryParams)} keys(properties)=${json(properties.map(p => p.path.join('.')))}`)
  if (empty(data) || empty(properties)) return data
  const docs = array(data)
  const relationshipDocs = {}
  for (const {path, property} of properties) {
    relationshipDocs[path.join('.')] = await fetchRelationshipDocs(docs, path, property, options)
  }
  const docsWithRelationships = docs.map(doc => {
    const relationships = properties.reduce((acc, {path, property}) => {
      for (const ref of nestedRelationshipRefs(doc, path)) {
        const orderedDocs = compact(ref.value.map(v => {
          const type = getType(v, property)
          const doc = getIn(relationshipDocs[ref.path.join('.')], [type, getId(v)])
          if (doc) {
            return typeof v === 'object' ? merge(v, doc) : doc
          } else {
            return undefined
          }
        }))
        if (notEmpty(orderedDocs)) {
          acc = setIn(acc, ref.path, property.type === 'array' ? orderedDocs : first(orderedDocs))
        } else {
          acc = setIn(acc, ref.path, undefined)
        }
      }
      return acc
    }, {})
    return deepMerge(doc, relationships)
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

function makeToValue (fromValue, fromType, id) {
  if (isObject(fromValue)) {
    return fromValue.type ? merge(fromValue, {id, type: fromType}) : merge(fromValue, {id})
  } else {
    return id
  }
}

function updateToValue (toValue, fromValue, fromType) {
  return isObject(toValue) ? merge(omit(fromValue, ['type']), {id: toValue.id}) : toValue
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
  const {toTypes, toField} = getIn(property, 'x-meta.relationship')
  const toType = first(toTypes)
  const fromType = getIn(options, 'model.type')
  if (!toField) return
  const api = await getToApi(toType, property, options.model, options.space)
  if (!api) return
  const toMany = (getIn(api, `model.schema.properties.${toField}.type`, 'array') === 'array')
  const toRequired = getIn(api, `model.schema.required`, []).includes(toField)
  const toCascade = (getIn(api, `model.schema.properties.${toField}.x-meta.relationship.onDelete`) === 'cascade')

  const existingValues = getIn(options, ['existingDoc', name])
  const {added, removed, changed} = relationshipDiff(existingValues, doc[name])

  logger.verbose(`updateRelationship ${options.model.type}.${name} -> ${toType}.${toField} toMany=${toMany} added=${json(added)} removed=${json(removed)} changed=${json(changed)}`)

  const skipCallbacks = ['updateAllRelationships', 'checkAccess', 'validateRelationships']
  const apiOptions = {skipCallbacks, user: options.user, space: options.space}
  for (let fromValue of added) {
    const toValue = makeToValue(fromValue, fromType, doc.id)
    const addValue = (values) => toMany ? concat(values, [toValue]) : toValue
    await api.update(getId(fromValue), {}, merge(apiOptions, {evolve: {[toField]: addValue}}))
  }
  for (let fromValue of removed) {
    const removeValue = (values) => (toMany && values) ? values.filter(v => getId(v) !== doc.id) : undefined
    if (!toMany && toRequired && toCascade) {
      await api.delete(getId(fromValue), apiOptions)
    } else {
      await api.update(getId(fromValue), {}, merge(apiOptions, {evolve: {[toField]: removeValue}}))
    }
  }
  for (let fromValue of changed) {
    const updateValue = (values) => {
      if (toMany) {
        return values.map(v => getId(v) === doc.id ? updateToValue(v, fromValue, fromType) : v)
      } else {
        return updateToValue(values, fromValue, fromType)
      }
    }
    await api.update(getId(fromValue), {}, merge(apiOptions, {evolve: {[toField]: updateValue}}))
  }
}

async function validateRelationships (doc, options) {
  const properties = nestedRelationshipProperties(options.model.schema)
  for (const {path, property} of properties) {
    const name = last(path)
    const validTypes = getIn(property, 'x-meta.relationship.toTypes')
    const docsByType = groupBy(nestedRelationshipValues(doc, path), (doc) => getType(doc, property))
    for (let [toType, docs] of keyValues(docsByType)) {
      if (!validTypes.includes(toType)) {
        throw validationError(options.model, doc, `contains the invalid type ${toType} for the following ids: ${docs.map(getId).join(', ')} - type must be one of ${validTypes.join(', ')}`, name)
      }
      const api = await getToApi(toType, property, options.model, options.space)
      if (api) {
        const ids = docs.map(getId)
        const query = {id: {$in: ids}}
        const listOptions = {limit: ids.length, projection: {id: 1}, user: options.user}
        const foundIds = (await api.list(query, listOptions)).map(d => d.id)
        const invalidIds = difference(ids, foundIds)
        if (notEmpty(invalidIds)) {
          throw validationError(options.model, doc, `contains the following invalid ids: ${invalidIds.join(', ')} for type ${toType}`, name)
        }
      } else {
        throw validationError(options.model, doc, `contains the following invalid type: ${toType}`, name)
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
      afterValidation: [validateRelationships],
      afterSave: [updateAllRelationships]
    },
    delete: {
      before: [checkCanDelete, deleteAllRelationships]
    },
    list: {
      before: [setGraphProjection],
      after: [fetchAllRelationships, fetchAllNestedRelationships]
    },
    get: {
      before: [setGraphProjection],
      after: [fetchAllRelationships, fetchAllNestedRelationships]
    },
    routeCreate: {
      after: [addRouteParameters]
    }
  }
}

module.exports = model
