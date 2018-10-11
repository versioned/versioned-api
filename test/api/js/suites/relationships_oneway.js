const {property} = require('lib/util')

module.exports = async function (c) {
  const accountId = c.data.account.id
  let result = await c.post('create space for relationships oneway test', `/${accountId}/spaces`, {name: 'Relationships Oneway Test', accountId: accountId})
  const spaceId = result.data.id

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
          articles: {
            type: 'array',
            items: {type: 'string'},
            'x-meta': {
              relationship: {
                toTypes: ['articles'],
                type: 'one-to-many'
              }
            }
          }
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
          body: {type: 'string'}
        },
        required: ['title'],
        additionalProperties: false
      }
    }
  }

  const author = {
    name: 'Hemingway'
  }

  const articles = [
    {title: 'The old man and the sea'},
    {title: 'A farewell to arms'}
  ]

  result = await c.post('create authors model', `/${spaceId}/models`, Author)
  result = await c.post('create articles model', `/${spaceId}/models`, Article)

  result = await c.post('create author without relationships', `/data/${spaceId}/authors`, author)
  author.id = result.data.id

  for (let i = 0; i < articles.length; i++) {
    result = await c.post(`create article ${i} without relationships`, `/data/${spaceId}/articles`, articles[i])
    articles[i].id = result.data.id
  }
  const articleIds = articles.map(property('id'))

  result = await c.put('add articles to author', `/data/${spaceId}/authors/${author.id}`, {articles: articleIds})

  result = await c.get('get author with relationships', `/data/${spaceId}/authors/${author.id}?relationshipLevels=1`)
  c.assertEqual(result.data.id, author.id)
  c.assertEqual(result.data.name, author.name)
  c.assertEqualKeys(['id', 'title'], result.data.articles, articles)

  result = await c.get('get articles 0', `/data/${spaceId}/articles/${articles[0].id}`)
  c.assertEqual(result.data.id, articles[0].id)
  c.assertEqual(result.data.title, articles[0].title)
  c.assert(!result.data.author)

  const newArticleIds = articleIds.slice(0, 1)
  result = await c.put('update author.articles', `/data/${spaceId}/authors/${author.id}`, {articles: newArticleIds})

  result = await c.get('get author', `/data/${spaceId}/authors/${author.id}`)
  c.assertEqual(result.data.id, author.id)
  c.assertEqual(result.data.name, author.name)
  c.assertEqual(result.data.articles, newArticleIds)

  result = await c.put('clear author.articles', `/data/${spaceId}/authors/${author.id}`, {articles: null})

  result = await c.get('get author', `/data/${spaceId}/authors/${author.id}`)
  c.assertEqual(result.data.id, author.id)
  c.assertEqual(result.data.name, author.name)
  c.assert(!result.data.articles)
}
