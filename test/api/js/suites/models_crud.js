const {setIn, keys, difference} = require('lib/util')
const {elapsedSeconds} = require('lib/date_util')
const models = require('app/models/models')

async function crudTest (c, prefix, coll, doc, updateDoc) {
  const listPath = `${prefix}/${coll}`

  let result = await c.get('can list docs', listPath)
  const countBefore = result.body.stats.count
  c.assertEqual(result.data.length, countBefore)

  await c.post({it: `cannot create without auth`, status: 401}, listPath, doc, c.anonymous)

  result = await c.post(`can create ${coll}`, listPath, doc)
  const id = result.data.id
  const created = result.data
  for (let key of keys(doc)) {
    if (typeof doc[key] !== 'object') {
      c.assertEqual(created[key], doc[key])
    }
  }
  c.assert(c.isMongoId(created._id))
  c.assert(elapsedSeconds(created.createdAt) < 1)
  c.assertEqual(created.createdBy, c.data.user.id)
  c.assert(!created.updatedAt)
  c.assert(!created.updatedBy)

  const getPath = `${listPath}/${id}`

  result = await c.get({it: 'cannot get without auth', status: 401}, getPath, c.anonymous)

  result = await c.get('can get created doc', getPath)
  for (let key of keys(doc)) {
    if (typeof doc[key] !== 'object') {
      c.assertEqual(result.data[key], doc[key])
    }
  }
  c.assertEqual(result.data.createdAt, created.createdAt)
  c.assertEqual(result.data.createdBy, created.createdBy)
  c.assert(!result.data.updatedAt)
  c.assert(!result.data.updatedBy)

  await c.get({it: 'cannot list without auth', status: 401}, listPath, c.anonymous)

  result = await c.get('can list docs', listPath)
  c.assertEqual(result.data[0].id, id)
  c.assertEqual(result.data[0].createdAt, created.createdAt)
  c.assertEqual(result.data[0].createdBy, created.createdBy)
  for (let key of keys(doc)) {
    if (typeof doc[key] !== 'object') {
      c.assertEqual(result.data[0][key], doc[key])
    }
  }
  const countAfter = result.body.stats.count
  c.assertEqual(countAfter, countBefore + 1)
  c.assertEqual(result.data.length, countAfter)

  await c.put({it: 'cannot update without auth', status: 401}, getPath, updateDoc, c.anonymous)

  result = await c.put('can update doc', getPath, updateDoc)
  c.assertEqual(result.data.id, id)
  c.assertEqual(result.data.createdAt, created.createdAt)
  c.assertEqual(result.data.createdBy, created.createdBy)
  for (let key of keys(updateDoc)) {
    c.assertEqual(result.data[key], updateDoc[key])
  }
  for (let key of difference(keys(doc), keys(updateDoc))) {
    if (typeof doc[key] !== 'object') {
      c.assertEqual(result.data[key], doc[key])
    }
  }
  c.assert(elapsedSeconds(result.data.updatedAt) < 1)
  c.assertEqual(result.data.updatedBy, c.data.user.id)

  await c.put({it: 'same update again yields 204', status: 204}, getPath, updateDoc)

  result = await c.get('can get updated doc', getPath)
  c.assertEqual(result.data.id, id)
  c.assertEqual(result.data.createdAt, created.createdAt)
  c.assertEqual(result.data.createdBy, created.createdBy)
  for (let key of keys(updateDoc)) {
    c.assertEqual(result.data[key], updateDoc[key])
  }
  for (let key of difference(keys(doc), keys(updateDoc))) {
    if (typeof doc[key] !== 'object') {
      c.assertEqual(result.data[key], doc[key])
    }
  }
  c.assert(elapsedSeconds(result.data.updatedAt) < 1)
  c.assertEqual(result.data.updatedBy, c.data.user.id)

  await c.delete({it: 'cannot delete without auth', status: 401}, getPath, c.anonymous)

  await c.delete('can delete doc', getPath)

  await c.get({it: 'cannot get deleted doc', status: 404}, getPath)

  await c.delete({it: 'trying to delete doc again', status: 404}, getPath)
}

module.exports = async function (c) {
  const spaceId = c.data.space.id

  const model = {
    title: 'Article',
    spaceId: spaceId,
    coll: 'articles',
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

  await crudTest(c, '', 'models', model, {title: 'Article changed'})

  let result = await c.post('create articles model', '/models', model)
  const modelId = result.data.id

  const article = {
    title: 'My first article',
    body: 'Welcome to my blog!'
  }
  const updateArticle = {
    title: 'Title changed'
  }
  const articlesColl = models.getColl(model)
  await crudTest(c, `/data/${spaceId}`, 'articles', article, updateArticle)

  await c.post('create article', `/data/${spaceId}/articles`, article)

  result = await c.get('check collection has one record in db stats', '/sys/db_stats')
  c.assertEqual(result.data[articlesColl].count, 1, `expecting ${articlesColl} to have 1 doc`)

  const modelUpdated = setIn(model, ['model', 'schema', 'properties'], {title: {type: 'string'}, slug: {type: 'string'}})
  await c.put('update articles model with new schema property', `/models/${modelId}`, modelUpdated)

  const anotherArticle = {
    title: 'My second article',
    slug: 'my-second-article'
  }
  await c.post('create another article with new property', `/data/${spaceId}/articles`, anotherArticle)

  await c.delete('delete articles model', `/models/${modelId}`)

  result = await c.get('check collection is no longer in db stats', '/sys/db_stats')
  c.assert(!result.data[models.getColl(model)], `expecting ${articlesColl} to not be there`)

  const thirdArticle = {
    title: 'My third article',
    slug: 'my-third-article'
  }
  await c.post({it: 'trying to create an article without model', status: 404}, `/data/${spaceId}/articles`, thirdArticle)
}
