function relationshipsModel (spaceId) {
  const relationships = {
    authors: {
      articles: {
        type: 'array',
        items: {type: 'string'},
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
      author: {
        type: 'string',
        'x-meta': {
          relationship: {
            toType: 'authors',
            toField: 'articles',
            type: 'many-to-one'
          }
        }
      },
      categories: {
        type: 'array',
        items: {type: 'string'},
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
        items: {type: 'string'},
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

  const Author = {
    name: 'Author',
    spaceId: spaceId,
    coll: 'authors',
    features: ['published'],
    model: {
      schema: {
        type: 'object',
        properties: {
          name: {type: 'string'},
          articles: relationships.authors.articles
        },
        required: ['name'],
        additionalProperties: false
      }
    }
  }

  const Article = {
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
          // author: relationships.articles.author,
          categories: relationships.articles.categories
        },
        required: ['title'],
        additionalProperties: false
      }
    }
  }

  const Category = {
    name: 'Category',
    spaceId: spaceId,
    coll: 'categories',
    features: ['published'],
    model: {
      schema: {
        type: 'object',
        properties: {
          name: {type: 'string'}
          // articles: relationships.categories.articles
        },
        required: ['name'],
        additionalProperties: false
      }
    }
  }

  return {
    relationships,
    Author,
    Article,
    Category
  }
}

module.exports = {
  relationshipsModel
}
