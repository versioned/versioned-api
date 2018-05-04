const {pick, merge} = require('lib/util')

module.exports = async function (c) {
  const accountId = c.data.account.id
  let result = await c.post('create space for relationships test', `/${accountId}/spaces`, {name: 'Relationship Test', accountId: accountId})
  const space = result.data
  const spaceId = space.id
  c.assert(spaceId)

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

  result = await c.post('create authors model', `/${accountId}/models`, Author)
  result = await c.post('create articles model', `/${accountId}/models`, Article)
  result = await c.post('create categories model', `/${accountId}/models`, Category)

  const author = {
    name: 'Hemingway'
  }

  const articles = [
    {title: 'The old man and the sea'},
    {title: 'A farewell to arms'}
  ]

  result = await c.post('create author', `/data/${spaceId}/authors`, author)
  author.id = result.data.id

  for (let i = 0; i < articles.length; i++) {
    result = await c.post(`create article ${i}`, `/data/${spaceId}/articles`, merge(articles[i], {author: author.id}))
    articles[i].id = result.data.id
  }

  const categories = [
    {name: 'Drama'},
    {name: 'War'}
  ]
  for (let i = 0; i < categories.length; i++) {
    result = await c.post(`create category ${i}`, `/data/${spaceId}/categories`, merge(categories[i], {articles: [articles[i].id]}))
    categories[i].id = result.data.id
  }

  result = await c.get('get author (relationship authors->articles)', `/data/${spaceId}/authors/${author.id}?relationships=1`)
  c.assertEqual(result.data.articles.map(a => pick(a, ['title', 'id'])), articles)

  result = await c.get('list authors (relationship authors->articles)', `/data/${spaceId}/authors?relationships=1`)
  c.assertEqual(pick(result.data[0], ['name', 'id']), author)
  c.assertEqual(result.data[0].articles.map(a => pick(a, ['title', 'id'])), articles)

  result = await c.get('get article 0 (relationships articles->author and articles->categories)', `/data/${spaceId}/articles/${articles[0].id}?relationships=1`)
  c.assertEqual(pick(result.data.author, ['name', 'id']), author)
  c.assertEqual(result.data.categories.map(c => pick(c, ['name', 'id'])), [categories[0]])

  result = await c.get('get article 1 (relationships articles->author and articles->categories)', `/data/${spaceId}/articles/${articles[1].id}?relationships=1`)
  c.assertEqual(pick(result.data.author, ['name', 'id']), author)
  c.assertEqual(result.data.categories.map(c => pick(c, ['name', 'id'])), [categories[1]])

  result = await c.get('list articles (relationships articles->author and articles->categories)', `/data/${spaceId}/articles?relationships=1`)
  c.assertEqual(pick(result.data[0].author, ['name', 'id']), author)
  c.assertEqual(pick(result.data[1].author, ['name', 'id']), author)
  c.assertEqual(result.data[0].categories.map(c => pick(c, ['name', 'id'])), [categories[1]])
  c.assertEqual(result.data[1].categories.map(c => pick(c, ['name', 'id'])), [categories[0]])

  result = await c.get('get category 0 (relationship categories->articles)', `/data/${spaceId}/categories/${categories[0].id}?relationships=1`)
  c.assertEqual(result.data.articles.map(c => pick(c, ['title', 'id'])), [articles[0]])

  result = await c.get('get category 1 (relationship categories->articles)', `/data/${spaceId}/categories/${categories[1].id}?relationships=1`)
  c.assertEqual(result.data.articles.map(c => pick(c, ['title', 'id'])), [articles[1]])

  result = await c.get('list categories (relationship categories->articles)', `/data/${spaceId}/categories?relationships=1`)
  c.assertEqual(result.data[0].articles.map(c => pick(c, ['title', 'id'])), [articles[1]])
  c.assertEqual(result.data[1].articles.map(c => pick(c, ['title', 'id'])), [articles[0]])
}
