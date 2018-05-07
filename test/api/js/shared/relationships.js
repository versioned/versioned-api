const {merge, compact} = require('lib/util')

function relationshipsModel (spaceId, options = {}) {
  const defaultOptions = {schema: {type: 'string'}, withRelationships: true}
  const {schema, withRelationships} = merge(defaultOptions, options)

  const relationships = {
    authors: {
      articles: {
        type: 'array',
        items: schema,
        'x-meta': {
          relationship: {
            toType: 'articles',
            toField: 'author',
            type: 'one-to-many'
          }
        }
      }
    },
    articles: {
      author: merge(schema, {
        'x-meta': {
          relationship: {
            toType: 'authors',
            toField: 'articles',
            type: 'many-to-one'
          }
        }
      }),
      categories: {
        type: 'array',
        items: schema,
        'x-meta': {
          relationship: {
            toType: 'categories',
            toField: 'articles',
            type: 'many-to-many'
          }
        }
      }
    },
    categories: {
      articles: {
        type: 'array',
        items: schema,
        'x-meta': {
          relationship: {
            toType: 'articles',
            toField: 'categories',
            type: 'many-to-many'
          }
        }
      }
    }
  }

  const Author = compact({
    name: 'Author',
    spaceId: spaceId,
    coll: 'authors',
    features: ['published'],
    model: {
      schema: {
        type: 'object',
        properties: {
          name: {type: 'string'},
          articles: (withRelationships ? relationships.authors.articles : undefined)
        },
        required: ['name'],
        additionalProperties: false
      }
    }
  })

  const Article = compact({
    name: 'Article',
    spaceId: spaceId,
    coll: 'articles',
    features: ['published'],
    model: {
      schema: {
        type: 'object',
        properties: {
          title: {type: 'string'},
          body: {type: 'string'},
          author: (withRelationships ? relationships.articles.author : undefined),
          categories: (withRelationships ? relationships.articles.categories : undefined)
        },
        required: ['title'],
        additionalProperties: false
      }
    }
  })

  const Category = compact({
    name: 'Category',
    spaceId: spaceId,
    coll: 'categories',
    features: ['published'],
    model: {
      schema: {
        type: 'object',
        properties: {
          name: {type: 'string'},
          articles: (withRelationships ? relationships.categories.articles : undefined)
        },
        required: ['name'],
        additionalProperties: false
      }
    }
  })

  const author = {
    name: 'Hemingway'
  }

  const articles = [
    {title: 'The old man and the sea'},
    {title: 'A farewell to arms'}
  ]

  const categories = [
    {name: 'Drama'},
    {name: 'War'}
  ]

  return {
    relationships,
    Author,
    Article,
    Category,
    author,
    articles,
    categories
  }
}

module.exports = {
  relationshipsModel
}
