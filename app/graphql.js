const {merge, getIn, zipObj, mapObj} = require('lib/util')
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

function getGraphQLType (schema) {
  if (schema.type === 'array') {
    return g.GraphQLList(getGraphQLType(schema.items))
  } else if (schema.type === 'object') {
    // TODO: return new GraphQLObjectType({}) with apppropriate fields
    return GraphQLJSON
  } else if (schema.type === 'string' && schema.format === 'date-time') {
    return GraphQLDateTime
  } else {
    return GRAPHQL_TYPES[schema.type]
  }
}

function resolveList (model, options) {
  return async function (...args) {
    const controller = await options.makeController(options.space, model)
    // TODO: if this is a relationship from a parent object - add: 'filter.id[in]'='1,2,3'
    const queryParams = {published: true}
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
  return async function (parentDoc) {
    // TODO: reuse code in relationships module
    // TODO: this code will not work with multi-type relationships
    // TODO: it also doesn't work for built-in (static) models
    const coll = getIn(schema, 'x-meta.relationship.toTypes.0')
    const model = options.modelsByColl[coll]
    if (!model) return
    const controller = await options.makeController(options.space, model)
    const queryParams = {published: true}
    const ids = parentDoc[key].map(d => d.id || d)
    if (schema.type === 'array') {
      const {data} = await controller._list(options.req, queryParams)
      return data
    } else {
      const {data} = await controller._get(options.req, ids[0], queryParams)
      return data
    }
  }
}

async function getModelObjectType (model, options) {
  const api = await _models.getApi(options.space, model)
  const schema = readableSchema(api.model)
  const fields = () => {
    return mapObj(schema.properties, (key, schema) => {
      let type = getGraphQLType(schema)
      if ((schema.required || []).includes(key)) type = g.GraphQLNonNull(type)
      const field = {type}
      if (getIn(schema, 'x-meta.relationship')) {
        field.resolve = resolveRelationship(key, schema, options)
      }
      return field
    })
  }
  return new GraphQLObjectType({
    name: model.name,
    fields
  })
}

function getRootQuery (objectTypes, options) {
  const {colls, modelsByColl} = options
  const objectTypesByColl = zipObj(colls, objectTypes)
  const fields = colls.reduce((acc, coll) => {
    acc[`${coll}List`] = {
      type: g.GraphQLList(objectTypesByColl[coll]),
      resolve: resolveList(modelsByColl[coll], options)
    }
    acc[`${coll}Get`] = {
      type: objectTypesByColl[coll],
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
  options = merge(options, {colls, modelsByColl})
  const objectTypes = await Promise.all(models.map(model => getModelObjectType(model, options)))
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
  // NOTE: the IntrospectionQuery sent by GraphiQL is extremely verbose so we don't log it
  if (source && !source.includes('IntrospectionQuery')) {
    logger.verbose(`graphql.query: ${source}`)
  }
  return graphql(args)
}

module.exports = {
  query
}
