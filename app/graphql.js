const {concat, unique, mapObj, isArray, flatten, groupBy, empty, makeObj, capitalize, notEmpty, dbFriendly, compact, array, merge, getIn, zipObj} = require('lib/util')
const config = require('app/config')
const {logger} = config.modules
const _models = require('app/models/models')
const spaces = require('app/models/spaces')
const {readableSchema} = require('lib/model_access')
const g = require('graphql')
const {
  graphql,
  GraphQLSchema,
  GraphQLObjectType
} = g
const GraphQLJSON = require('graphql-type-json')
const {GraphQLDateTime} = require('graphql-iso-date')

const GRAPHQL_TYPES = {
  string: g.GraphQLString,
  integer: g.GraphQLInt,
  number: g.GraphQLFloat,
  boolean: g.GraphQLBoolean
}

const OPERATIONS = ['eq', 'ne', 'in', 'exists', 'lt', 'gt', 'lte', 'gte']

const Filter = new g.GraphQLInputObjectType({
  name: '_Filter',
  fields: {
    field: {type: g.GraphQLNonNull(g.GraphQLString)},
    operation: {type: new g.GraphQLEnumType({
      name: '_Operation',
      values: makeObj(OPERATIONS, () => ({}))
    })},
    value: {type: g.GraphQLNonNull(g.GraphQLString)}
  }
})

const LIST_ARGS = {
  limit: {
    type: g.GraphQLInt
  },
  skip: {
    type: g.GraphQLInt
  },
  sort: {
    type: g.GraphQLString
  },
  filters: {
    type: g.GraphQLList(Filter)
  }
}

function objectTypeName (model) {
  const friendlyName = dbFriendly(model.name)
  if (notEmpty(friendlyName)) {
    return friendlyName.split('_').map(capitalize).join('')
  } else {
    return model.coll
  }
}

function listQueryParams (args) {
  let params = merge(args, {published: true})
  if (params.filters) {
    for (let filter of params.filters) {
      const operation = filter.operation || 'eq'
      params[`filter.${filter.field}[${operation}]`] = filter.value
    }
    delete params.filters
  }
  return params
}

function getRelationshipModels (schema, options) {
  const toTypes = getIn(schema, 'x-meta.relationship.toTypes', [])
  const models = compact(toTypes.map(type => options.modelsByColl[type]))
  return notEmpty(models) ? models : undefined
}

function getRelationshipTypes (schema, options) {
  const relationshipModels = getRelationshipModels(schema, options)
  return relationshipModels && relationshipModels.map((targetModel) => {
    return options.objectTypes[objectTypeName(targetModel)]
  })
}

function lookupObjectType (type, options) {
  const model = options.modelsByColl[type]
  return options.objectTypes[objectTypeName(model)]
}

function resolveType (doc, options) {
  return lookupObjectType(doc.type, options)
}

function unionType (model, key, types, options) {
  return new g.GraphQLUnionType({
    name: `_${model.name}${capitalize(key)}Union`,
    types,
    resolveType: (doc) => resolveType(doc, options)
  })
}

function getGraphQLType (key, schema, model, options) {
  const relationshipTypes = getRelationshipTypes(schema, options)
  if (relationshipTypes) {
    let result = relationshipTypes.length > 1 ? unionType(model, key, relationshipTypes, options) : relationshipTypes[0]
    if (schema.type === 'array') result = g.GraphQLList(result)
    return result
  } else if (schema.type === 'array') {
    return g.GraphQLList(getGraphQLType(key, schema.items, model, options))
  } else if (schema.type === 'object') {
    return GraphQLJSON
  } else if (schema.type === 'string' && schema.format === 'date-time') {
    return GraphQLDateTime
  } else {
    return GRAPHQL_TYPES[schema.type]
  }
}

function getGraphQLInterface (model, schema, key, options) {
  const subSchema = schema.properties[key]
  const relationshipModels = getRelationshipModels(subSchema, options)
  if (!relationshipModels || relationshipModels.length <= 1) return
  const coll = relationshipModels[0].coll
  const properties = getIn(options.schemasByColl, `${coll}.properties`)
  const fields = Object.keys(properties).reduce((acc, key) => {
    const typeKey = properties[key].type === 'array' ? 'items' : 'type'
    const fieldTypes = relationshipModels.map(model => getIn(model, `model.schema.properties.${key}.${typeKey}`))
    // Only include shared field names with the same type
    if (unique(fieldTypes).length === 1) {
      acc[key] = getGraphQLField(model, schema, key, options)
    }
    return acc
  }, {})
  if (empty(fields) || Object.keys(fields).length <= 1) return
  let interfaceType = new g.GraphQLInterfaceType({
    name: `_${model.name}${capitalize(key)}Interface`,
    fields,
    resolveType: (doc) => resolveType(doc, options)
  })
  getRelationshipTypes(subSchema, options).forEach((objectType) => {
    const interfaces = concat(objectType._interfaces(), [interfaceType])
    objectType._interfaces = () => interfaces
  })
  if (subSchema.type === 'array') interfaceType = g.GraphQLList(interfaceType)
  return interfaceType
}

function getGraphQLField (model, schema, key, options) {
  const subSchema = schema.properties[key]
  let type = (options.interfaceType ? options.interfaceType : getGraphQLType(key, subSchema, model, options))
  if ((subSchema.required || []).includes(key)) type = g.GraphQLNonNull(type)
  const field = {type}
  if (getRelationshipModels(subSchema, options)) {
    if (subSchema.type === 'array') field.args = LIST_ARGS
    field.resolve = resolveRelationship(key, subSchema, options)
  }
  return field
}

function resolveList (model, options) {
  return async function (parent, args) {
    const controller = await options.makeController(options.space, model)
    // TODO: if this is a relationship from a parent object - add: 'filter.id[in]'='1,2,3'
    const queryParams = listQueryParams(args)
    // TODO: don't unwrap data here
    const {data} = await controller._list(options.req, queryParams)
    return data
  }
}

function resolveGet (model, options) {
  return async function (parent, args) {
    const controller = await options.makeController(options.space, model)
    const queryParams = {published: true}
    const {data} = await controller._get(options.req, args.id, queryParams)
    return data
  }
}

function getId (reference) {
  return reference.id || reference
}

function resolveRelationship (key, schema, options) {
  return async function (parentDoc, args) {
    const defaultType = getIn(schema, 'x-meta.relationship.toTypes.0')
    const getType = (ref) => ref.type || defaultType
    const refs = array(parentDoc[key])
    if (empty(refs)) return
    const refsByType = groupBy(refs, getType)
    const types = Object.keys(refsByType)
    const docs = await Promise.all(types.map((type) => {
      return fetchRelationshipForType(type, key, schema, parentDoc, args, options)
    }))
    const docsByType = zipObj(types, docs)
    const result = compact(flatten(refs.map((ref) => {
      const value = docsByType[getType(ref)]
      return isArray(value) ? value.find(d => d.id === getId(ref)) : value
    })))
    return schema.type === 'array' ? result : result[0]
  }
}

async function fetchRelationshipForType (type, key, schema, parentDoc, args, options) {
  const targetModel = options.modelsByColl[type]
  if (!targetModel) return
  const controller = await options.makeController(options.space, targetModel)
  const ids = array(parentDoc[key]).map(getId)
  if (schema.type === 'array') {
    const idsQuery = {'filter.id[in]': ids.join(',')}
    const queryParams = merge(listQueryParams(args), idsQuery)
    const {data} = await controller._list(options.req, queryParams)
    const sortedData = compact(ids.map(id => data.find(doc => doc.id === id)))
    return sortedData
  } else {
    let queryParams = {published: true}
    const {data} = await controller._get(options.req, ids[0], queryParams)
    return data
  }
}

async function getModelSchema (model, options) {
  const api = await _models.getApi(options.space, model)
  return readableSchema(api.model)
}

async function getModelObjectType (model, options) {
  const schema = options.schemasByColl[model.coll]
  // NOTE: GraphQL fields must be a value or a function returning a value (a thunk), it cannot be an async function
  const fields = () => {
    const propertiesFields = mapObj(schema.properties, (key) => {
      return getGraphQLField(model, schema, key, options)
    })
    const interfaceFields = Object.keys(schema.properties).reduce((acc, key) => {
      const interfaceType = getGraphQLInterface(model, schema, key, options)
      if (interfaceType) {
        const interfaceKey = `_${key}`
        acc[interfaceKey] = getGraphQLField(model, schema, key, merge(options, {interfaceType}))
      }
      return acc
    }, {})
    return merge(propertiesFields, interfaceFields)
  }
  return new GraphQLObjectType({
    name: objectTypeName(model),
    fields
  })
}

function getRootQuery (objectTypes, options) {
  const {colls, modelsByColl} = options
  const objectTypesByColl = zipObj(colls, objectTypes)
  const fields = colls.reduce((acc, coll) => {
    const objectType = objectTypesByColl[coll]
    acc[`${objectType.name}List`] = {
      type: g.GraphQLList(objectType),
      args: LIST_ARGS,
      resolve: resolveList(modelsByColl[coll], options)
    }
    acc[`${objectType.name}Get`] = {
      type: objectType,
      args: {
        id: {
          type: g.GraphQLString
        }
      },
      resolve: resolveGet(modelsByColl[coll], options)
    }
    return acc
  }, {})
  return new GraphQLObjectType({
    name: 'RootQueryType',
    fields
  })
}

async function getSchema (options) {
  const modelsApi = await spaces.getApi(options.space, _models.model)
  const models = await modelsApi.list({spaceId: options.space.id})
  const colls = models.map(model => model.coll)
  const modelsByColl = zipObj(colls, models)
  const schemas = await Promise.all(models.map(model => getModelSchema(model, options)))
  const schemasByColl = zipObj(colls, schemas)
  options = merge(options, {colls, modelsByColl, schemasByColl, objectTypes: {}})
  const objectTypes = []
  for (let model of models) {
    let objectType = await getModelObjectType(model, options)
    options.objectTypes[objectType.name] = objectType
    objectTypes.push(objectType)
  }
  const rootQuery = getRootQuery(objectTypes, options)
  return new GraphQLSchema({
    query: rootQuery,
    types: objectTypes
  })
}

async function query (source, options = {}) {
  const graphQLOptions = options.graphQLOptions || {}
  const schema = await getSchema(options)
  const args = {
    source,
    schema,
    operationName: graphQLOptions.operationName,
    variableValues: graphQLOptions.variables
  }
  // NOTE: IntrospectionQuery sent by GraphiQL is too verbose to log
  if (source && !source.includes('IntrospectionQuery')) {
    logger.verbose(`graphql.query: ${source}`)
  }
  return graphql(args)
}

module.exports = {
  query
}
