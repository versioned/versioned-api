const {makeObj, capitalize, notEmpty, dbFriendly, compact, array, merge, getIn, zipObj} = require('lib/util')
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

function getTargetModel (schema, options) {
  const toTypes = getIn(schema, 'x-meta.relationship.toTypes', [])
  // NOTE: we don't handle multi-type relationships
  if (toTypes.length === 1) {
    return options.modelsByColl[toTypes[0]]
  } else {
    return undefined
  }
}

function getGraphQLType (schema, model, options) {
  const targetModel = getTargetModel(schema, options)
  if (targetModel) {
    const targetType = options.objectTypes[objectTypeName(targetModel)]
    return schema.type === 'array' ? g.GraphQLList(targetType) : targetType
  } else if (schema.type === 'array') {
    return g.GraphQLList(getGraphQLType(schema.items))
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

function resolveRelationship (key, schema, options) {
  return async function (parentDoc, args) {
    // TODO: reuse code in relationships module
    // TODO: this code will not work with multi-type relationships - need Union Types for that
    const targetModel = getTargetModel(schema, options)
    if (!targetModel) return
    const controller = await options.makeController(options.space, targetModel)
    const ids = array(parentDoc[key]).map(d => d.id || d)
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
}

async function getModelObjectType (model, options) {
  const api = await _models.getApi(options.space, model)
  const schema = readableSchema(api.model)
  // NOTE: fields must be a value or a function returning a value, it cannot be an async function
  const fields = () => {
    const keys = Object.keys(schema.properties)
    const values = keys.map((key) => {
      const subSchema = schema.properties[key]
      let type = getGraphQLType(subSchema, model, options)
      if ((subSchema.required || []).includes(key)) type = g.GraphQLNonNull(type)
      const field = {type}
      if (getTargetModel(subSchema, options)) {
        field.args = LIST_ARGS
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
