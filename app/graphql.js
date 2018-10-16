const {zipObj, mapObj} = require('lib/util')
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

function getArticles (...args) {
  // console.log('pm debug getArticles args:', JSON.stringify(args, null, 4))
  return [{id: '123', title: 'foobar'}]
}

function getAuthor (...args) {
  // console.log('pm debug getAuthor args:', JSON.stringify(args, null, 4))
}

const Author = new GraphQLObjectType({
  name: 'Author',
  description: '',
  fields: () => ({
    id: {
      type: g.GraphQLNonNull(g.GraphQLString)
    },
    title: {
      type: g.GraphQLString,
      description: ''
    },
    articles: {
      type: g.GraphQLList(Article),
      resolve: getArticles
    }
  })
})

const Article = new GraphQLObjectType({
  name: 'Article',
  description: '',
  fields: () => ({
    id: {
      type: g.GraphQLNonNull(g.GraphQLString)
    },
    title: {
      type: g.GraphQLString,
      description: ''
    },
    author: {
      type: Author,
      resolve: getAuthor
    }
  })
})

const types = [
  Author,
  Article
]

const rootQuery = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: () => ({
    articles: {
      type: g.GraphQLList(Article),
      args: {
        id: {
          type: g.GraphQLString
        }
      },
      resolve: getArticles
    }
  })
})

const schema = new GraphQLSchema({
  query: rootQuery,
  types
})

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
  } else {
    return GRAPHQL_TYPES[schema.type]
  }
}

async function getModelObjectType (model, space, options) {
  const api = await _models.getApi(space, model)
  const schema = readableSchema(api.model)
  const fields = mapObj(schema.properties, (key, schema) => {
    let type = getGraphQLType(schema)
    if ((schema.required || []).includes(key)) type = g.GraphQLNonNull(type)
    return {type}
  })
  return new GraphQLObjectType({
    name: model.name,
    fields
  })
}

function resolveModel (model) {
  // TODO: use options.makeController()._list|_get with published=1 and filter.id[in]="1,2,3" and unwrap response data
  return function () {
    return [{id: '123', title: 'foobar'}]
  }
}

function getRootQuery (models, objectTypes) {
  const colls = models.map(model => model.coll)
  const modelsByColl = zipObj(colls, models)
  const objectTypesByColl = zipObj(colls, objectTypes)
  const fields = mapObj(objectTypesByColl, (coll, objectType) => {
    return {
      type: g.GraphQLList(objectType),
      args: {
        id: {
          type: g.GraphQLString
        }
      },
      resolve: resolveModel(modelsByColl[coll])
    }
  })
  return new GraphQLObjectType({
    name: 'RootQueryType',
    fields
  })
}

async function getSchema (space, options) {
  const modelsApi = await spaces.getApi(space, _models.model)
  const models = await modelsApi.list({spaceId: space.id})
  const objectTypes = await Promise.all(models.map(model => getModelObjectType(model, space, options)))
  const rootQuery = getRootQuery(models, objectTypes)
  return new GraphQLSchema({
    query: rootQuery,
    types: objectTypes
  })
}

async function query (space, source, options = {}) {
  const graphQLOptions = options.graphQLOptions || {}
  const schema = await getSchema(space, options)
  const args = {
    source,
    schema,
    operationName: graphQLOptions.operationName,
    variableValues: graphQLOptions.variables
  }
  // NOTE: the IntrospectionQuery sent by GraphiQL is extremely verbose so we don't log it
  if (source && !source.includes('IntrospectionQuery')) {
    logger.verbose(`graphql.query: ${source}`)
    // logger.verbose('parsed graphql query:', JSON.stringify(require('graphql').parse(source), null, 4))
  }
  return graphql(args)
}

module.exports = {
  schema,
  query
}
