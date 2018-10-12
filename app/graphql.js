// For relevant information about graphQL, see:
// https://github.com/graphql/graphql-js
// https://graphql.org/learn/serving-over-http
// https://graphql.org/learn/introspection
// https://github.com/graphql/graphql-js/blob/master/src/__tests__/starWarsSchema.js

const {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString
} = require('graphql')

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'RootQueryType',
    fields: {
      hello: {
        type: GraphQLString,
        resolve () {
          return 'world'
        }
      }
    }
  })
})

async function query (q) {
  return graphql(schema, q)
}

module.exports = {
  schema,
  query
}
