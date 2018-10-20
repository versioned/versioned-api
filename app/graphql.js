const {isArray, flatten, groupBy, empty, makeObj, capitalize, notEmpty, dbFriendly, compact, array, merge, getIn, zipObj} = require('lib/util')
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

function lookupObjectType (type, options) {
  const model = options.modelsByColl[type]
  return options.objectTypes[objectTypeName(model)]
}

function unionType (model, key, types, options) {
  const resolveType = (doc) => lookupObjectType(doc.type, options)
  return new g.GraphQLUnionType({
    name: `_${model.name}${capitalize(key)}Relationship`,
    types,
    resolveType
  })
}

function getGraphQLType (key, schema, model, options) {
  const relationshipModels = getRelationshipModels(schema, options)
  if (relationshipModels) {
    const targetTypes = relationshipModels.map((targetModel) => {
      return options.objectTypes[objectTypeName(targetModel)]
    })
    let result = targetTypes.length > 1 ? unionType(model, key, targetTypes, options) : targetTypes[0]
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

async function getModelObjectType (model, options) {
  const api = await _models.getApi(options.space, model)
  const schema = readableSchema(api.model)
  // NOTE: GraphQL fields must be a value or a function returning a value (a thunk), it cannot be an async function
  const fields = () => {
    const keys = Object.keys(schema.properties)
    const values = keys.map((key) => {
      const subSchema = schema.properties[key]
      let type = getGraphQLType(key, subSchema, model, options)
      if ((subSchema.required || []).includes(key)) type = g.GraphQLNonNull(type)
      const field = {type}
      if (getRelationshipModels(subSchema, options)) {
        if (subSchema.type === 'array') field.args = LIST_ARGS
        field.resolve = resolveRelationship(key, subSchema, options)
      }
      return field
    })
    return zipObj(keys, values)
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
  options = merge(options, {colls, modelsByColl, objectTypes: {}})
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
