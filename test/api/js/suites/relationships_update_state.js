const {relationshipsModel} = require('../shared/relationships')

module.exports = async function (c) {
  const accountId = c.data.account.id
  let result = await c.post('create space for relationships update state test', `/${accountId}/spaces`, {name: 'Relationships Update State Test', accountId: accountId})
  const spaceId = result.data.id

  const schema = {
    type: 'object',
    properties: {
      id: {type: 'string'},
      score: {type: 'string'}
    },
    required: ['id', 'score'],
    additionalProperties: false
  }
  const {Author, Article, Category, author, articles, categories} = relationshipsModel(spaceId, {schema})
  const article = articles[0]
  const category = categories[0]

  result = await c.post('create authors model', `/${spaceId}/models`, Author)
  result = await c.post('create articles model', `/${spaceId}/models`, Article)
  result = await c.post('create categories model', `/${spaceId}/models`, Category)

  result = await c.post('create author without relationships', `/data/${spaceId}/authors`, author)
  author.id = result.data.id

  result = await c.post(`create article without relationships`, `/data/${spaceId}/articles`, article)
  article.id = result.data.id

  result = await c.post(`create category without relationships`, `/data/${spaceId}/categories`, category)
  category.id = result.data.id

  const score = c.uuid()

  result = await c.put('authors.articles - one-to-many add', `/data/${spaceId}/authors/${author.id}`, {articles: [{id: article.id, score}]})
  result = await c.get('get from side of relationship', `/data/${spaceId}/authors/${author.id}`)
  c.assertEqual(result.data.articles, [{id: article.id, score}])
  result = await c.get('get to side of relationship', `/data/${spaceId}/articles/${article.id}`)
  c.assertEqual(result.data.author, {id: author.id, score})

  result = await c.put('authors.articles - one-to-many delete', `/data/${spaceId}/authors/${author.id}`, {articles: null})
  result = await c.get('get from side of relationship', `/data/${spaceId}/authors/${author.id}`)
  c.assert(!result.data.articles)
  result = await c.get('get to side of relationship', `/data/${spaceId}/articles/${article.id}`)
  c.assert(!result.data.author)

  result = await c.put('articles.author - many-to-one add', `/data/${spaceId}/articles/${article.id}`, {author: {id: author.id, score}})
  result = await c.get('get from side of relationship', `/data/${spaceId}/authors/${author.id}`)
  c.assertEqual(result.data.articles, [{id: article.id, score}])
  result = await c.get('get to side of relationship', `/data/${spaceId}/articles/${article.id}`)
  c.assertEqual(result.data.author, {id: author.id, score})

  result = await c.put('articles.author - many-to-one delete', `/data/${spaceId}/articles/${article.id}`, {author: null})
  result = await c.get('get from side of relationship', `/data/${spaceId}/authors/${author.id}`)
  c.assert(!result.data.articles)
  result = await c.get('get to side of relationship', `/data/${spaceId}/articles/${article.id}`)
  c.assert(!result.data.author)

  result = await c.put('categories.articles - many-to-many add', `/data/${spaceId}/categories/${category.id}`, {articles: [{id: article.id, score}]})
  result = await c.get('get from side of relationship', `/data/${spaceId}/articles/${article.id}`)
  c.assertEqual(result.data.categories, [{id: category.id, score}])
  result = await c.get('get to side of relationship', `/data/${spaceId}/categories/${category.id}`)
  c.assertEqual(result.data.articles, [{id: article.id, score}])

  result = await c.put('categories.articles - many-to-many delete', `/data/${spaceId}/categories/${category.id}`, {articles: null})
  result = await c.get('get from side of relationship', `/data/${spaceId}/articles/${article.id}`)
  c.assert(!result.data.categories)
  result = await c.get('get to side of relationship', `/data/${spaceId}/categories/${category.id}`)
  c.assert(!result.data.articles)
}
