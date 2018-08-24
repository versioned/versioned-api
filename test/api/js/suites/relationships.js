const {compact, property, pick, merge} = require('lib/util')
const {relationshipsModel} = require('../shared/relationships')

module.exports = async function (c) {
  const accountId = c.data.account.id
  let result = await c.post('create space for relationships test', `/${accountId}/spaces`, {name: 'Relationships Test', accountId: accountId})
  const spaceId = result.data.id

  const {Author, Article, Category, author, articles, categories} = relationshipsModel(spaceId)

  result = await c.post('create authors model', `/${spaceId}/models`, Author)
  result = await c.post('create articles model', `/${spaceId}/models`, Article)
  result = await c.post('create categories model', `/${spaceId}/models`, Category)

  result = await c.post('create author', `/data/${spaceId}/authors`, author)
  author.id = result.data.id

  for (let i = 0; i < articles.length; i++) {
    result = await c.post(`create article ${i}`, `/data/${spaceId}/articles`, merge(articles[i], {author: author.id}))
    articles[i].id = result.data.id
  }

  for (let i = 0; i < categories.length; i++) {
    result = await c.post(`create category ${i}`, `/data/${spaceId}/categories`, merge(categories[i], {articles: [articles[i].id]}))
    categories[i].id = result.data.id
  }

  result = await c.get('get author (relationship authors->articles)', `/data/${spaceId}/authors/${author.id}?relationshipLevels=1`)
  c.assertEqual(result.data.articles.map(a => pick(a, ['title', 'id'])), articles)

  result = await c.get('list authors (relationship authors->articles)', `/data/${spaceId}/authors?relationshipLevels=1`)
  c.assertEqual(pick(result.data[0], ['name', 'id']), author)
  c.assertEqual(result.data[0].articles.map(a => pick(a, ['title', 'id'])), articles)

  result = await c.get('get article 0 (relationships articles->author and articles->categories)', `/data/${spaceId}/articles/${articles[0].id}?relationshipLevels=1`)
  c.assertEqual(pick(result.data.author, ['name', 'id']), author)
  c.assertEqual(result.data.categories.map(c => pick(c, ['name', 'id'])), [categories[0]])

  result = await c.get('get article 1 (relationships articles->author and articles->categories)', `/data/${spaceId}/articles/${articles[1].id}?relationshipLevels=1`)
  c.assertEqual(pick(result.data.author, ['name', 'id']), author)
  c.assertEqual(result.data.categories.map(c => pick(c, ['name', 'id'])), [categories[1]])

  result = await c.get('list articles (relationships articles->author and articles->categories)', `/data/${spaceId}/articles?relationshipLevels=1`)
  c.assertEqual(pick(result.data[0].author, ['name', 'id']), author)
  c.assertEqual(pick(result.data[1].author, ['name', 'id']), author)
  c.assertEqual(result.data[0].categories.map(c => pick(c, ['name', 'id'])), [categories[1]])
  c.assertEqual(result.data[1].categories.map(c => pick(c, ['name', 'id'])), [categories[0]])

  result = await c.get('get category 0 (relationship categories->articles)', `/data/${spaceId}/categories/${categories[0].id}?relationshipLevels=1`)
  c.assertEqual(result.data.articles.map(c => pick(c, ['title', 'id'])), [articles[0]])

  result = await c.get('get category 1 (relationship categories->articles)', `/data/${spaceId}/categories/${categories[1].id}?relationshipLevels=1`)
  c.assertEqual(result.data.articles.map(c => pick(c, ['title', 'id'])), [articles[1]])

  result = await c.get('list categories (relationship categories->articles)', `/data/${spaceId}/categories?relationshipLevels=1`)
  c.assertEqual(result.data[0].articles.map(c => pick(c, ['title', 'id'])), [articles[1]])
  c.assertEqual(result.data[1].articles.map(c => pick(c, ['title', 'id'])), [articles[0]])

  result = await c.get('get author with two levels of nesting (relationship authors->articles, articles->categories)', `/data/${spaceId}/authors/${author.id}?relationshipLevels=2`)
  c.assertEqual(result.data.articles.map(a => pick(a, ['title', 'id'])), articles)
  c.assertEqual(compact(result.data.articles.map(property('author'))), []) // only fetch author once
  c.assertEqualKeys(['name', 'id'], result.data.articles[0].categories, [categories[0]])
  c.assertEqualKeys(['name', 'id'], result.data.articles[1].categories, [categories[1]])
  c.assertEqual(result.data.articles[0].categories[0].articles, [articles[0].id])
  c.assertEqual(result.data.articles[1].categories[0].articles, [articles[1].id])

  result = await c.put('publish author', `/data/${spaceId}/authors/${author.id}`, {publishedVersion: 1})

  result = await c.get('get published author with relationships (authors->articles)', `/data/${spaceId}/authors/${author.id}?published=1&relationshipLevels=1`)
  c.assertEqual(result.data.publishedVersion, 1)
  c.assert(!result.data.articles) // articles are not published yet

  result = await c.get('list published authors (relationship authors->articles)', `/data/${spaceId}/authors?relationshipLevels=1&published=1`)
  c.assert(!result.data[0].articles) // articles are not published yet

  result = await c.put('publish article 0', `/data/${spaceId}/articles/${articles[0].id}`, {publishedVersion: 1})

  result = await c.get('get published author with relationships (authors->articles)', `/data/${spaceId}/authors/${author.id}?published=1&relationshipLevels=1`)
  c.assert(result.data.articles.map(c => pick(c, ['title', 'id'])), [articles[0]])

  result = await c.get('list published authors (relationship authors->articles)', `/data/${spaceId}/authors?relationshipLevels=1&published=1`)
  c.assert(result.data[0].articles.map(c => pick(c, ['title', 'id'])), [articles[0]])

  result = await c.get('get published article 0 relationship (articles->author)', `/data/${spaceId}/articles/${articles[0].id}?published=1&relationshipLevels=1`)
  c.assertEqualKeys(['name', 'id'], result.data.author, author)

  result = await c.get({it: 'get published article 1 - missing', status: 404}, `/data/${spaceId}/articles/${articles[1].id}?published=1&relationshipLevels=1`)

  result = await c.put('publish article 1', `/data/${spaceId}/articles/${articles[1].id}`, {publishedVersion: 1})

  result = await c.get('get published author with relationships (authors->articles)', `/data/${spaceId}/authors/${author.id}?published=1&relationshipLevels=1`)
  c.assert(result.data.articles.map(c => pick(c, ['title', 'id'])), [articles[0], articles[1]])
}
