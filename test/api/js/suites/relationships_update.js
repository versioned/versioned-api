const {relationshipsModel} = require('../shared/relationships')

module.exports = async function (c) {
  const accountId = c.data.account.id
  let result = await c.post('create space for relationships update test', `/${accountId}/spaces`, {name: 'Relationships Update Test', accountId: accountId})
  const spaceId = result.data.id

  const {Author, Article, Category, author, articles, categories} = relationshipsModel(spaceId)
  const article = articles[0]
  const category = categories[0]

  result = await c.post('create authors model', `/${accountId}/models`, Author)
  result = await c.post('create articles model', `/${accountId}/models`, Article)
  result = await c.post('create categories model', `/${accountId}/models`, Category)

  result = await c.post('create author without relationships', `/data/${spaceId}/authors`, author)
  author.id = result.data.id

  result = await c.post(`create article without relationships`, `/data/${spaceId}/articles`, article)
  article.id = result.data.id

  result = await c.post(`create category without relationships`, `/data/${spaceId}/categories`, category)
  category.id = result.data.id

  result = await c.put('authors.articles - one-to-many add', `/data/${spaceId}/authors/${author.id}`, {articles: [article.id]})
  result = await c.get('get from side of relationship', `/data/${spaceId}/authors/${author.id}`)
  c.assertEqual(result.data.articles, [article.id])
  result = await c.get('get to side of relationship', `/data/${spaceId}/articles/${article.id}`)
  c.assertEqual(result.data.author, author.id)

  result = await c.put('authors.articles - one-to-many delete', `/data/${spaceId}/authors/${author.id}`, {articles: null})
  result = await c.get('get from side of relationship', `/data/${spaceId}/authors/${author.id}`)
  c.assert(!result.data.articles)
  result = await c.get('get to side of relationship', `/data/${spaceId}/articles/${article.id}`)
  c.assert(!result.data.author)

  result = await c.put('articles.author - many-to-one add', `/data/${spaceId}/articles/${article.id}`, {author: author.id})
  result = await c.get('get from side of relationship', `/data/${spaceId}/authors/${author.id}`)
  c.assertEqual(result.data.articles, [article.id])
  result = await c.get('get to side of relationship', `/data/${spaceId}/articles/${article.id}`)
  c.assertEqual(result.data.author, author.id)

  result = await c.put('articles.author - many-to-one delete', `/data/${spaceId}/articles/${article.id}`, {author: null})
  result = await c.get('get from side of relationship', `/data/${spaceId}/authors/${author.id}`)
  c.assert(!result.data.articles)
  result = await c.get('get to side of relationship', `/data/${spaceId}/articles/${article.id}`)
  c.assert(!result.data.author)

  result = await c.put('categories.articles - many-to-many add', `/data/${spaceId}/categories/${category.id}`, {articles: [article.id]})
  result = await c.get('get from side of relationship', `/data/${spaceId}/articles/${article.id}`)
  c.assertEqual(result.data.categories, [category.id])
  result = await c.get('get to side of relationship', `/data/${spaceId}/categories/${category.id}`)
  c.assertEqual(result.data.articles, [article.id])

  result = await c.put('categories.articles - many-to-many delete', `/data/${spaceId}/categories/${category.id}`, {articles: null})
  result = await c.get('get from side of relationship', `/data/${spaceId}/articles/${article.id}`)
  c.assert(!result.data.categories)
  result = await c.get('get to side of relationship', `/data/${spaceId}/categories/${category.id}`)
  c.assert(!result.data.articles)
}
