const {setIn, keys, difference} = require('lib/util')
const {elapsedSeconds} = require('lib/date_util')

async function crudTest (c, prefix, coll, doc, updateDoc) {
  const anonymous = {headers: {authorization: null}}
  const listPath = `${prefix}/${coll}`

  await c.post({it: `cannot create without auth`, status: 401}, listPath, doc, anonymous)
  let result = await c.post(`can create ${coll}`, `${prefix}/${coll}`, doc)
  const id = result.data.id
  const created = result.data
  for (let key of keys(doc)) {
    c.assertEqual(created[key], doc[key])
  }
  c.assert(c.isMongoId(created._id))
  c.assert(elapsedSeconds(created.created_at) < 1)
  c.assertEqual(created.created_by, c.data.user.id)
  c.assert(!created.updated_at)
  c.assert(!created.updated_by)

  const getPath = `${listPath}/${id}`

  result = await c.get({it: 'cannot get without auth', status: 401}, getPath, anonymous)

  result = await c.get('can get created doc', getPath)
  for (let key of keys(doc)) {
    c.assertEqual(result.data[key], doc[key])
  }
  c.assertEqual(result.data.created_at, created.created_at)
  c.assertEqual(result.data.created_by, created.created_by)
  c.assert(!result.data.updated_at)
  c.assert(!result.data.updated_by)

  await c.get({it: 'cannot list without auth', status: 401}, listPath, anonymous)

  result = await c.get('can list docs', listPath)
  c.assertEqual(result.data[0].id, id)
  c.assertEqual(result.data[0].created_at, created.created_at)
  c.assertEqual(result.data[0].created_by, created.created_by)
  for (let key of keys(doc)) {
    c.assertEqual(result.data[0][key], doc[key])
  }

  await c.put({it: 'cannot update without auth', status: 401}, getPath, updateDoc, anonymous)

  result = await c.put('can update doc', getPath, updateDoc)
  c.assertEqual(result.data.id, id)
  c.assertEqual(result.data.created_at, created.created_at)
  c.assertEqual(result.data.created_by, created.created_by)
  for (let key of keys(updateDoc)) {
    c.assertEqual(result.data[key], updateDoc[key])
  }
  for (let key of difference(keys(doc), keys(updateDoc))) {
    c.assertEqual(result.data[key], doc[key])
  }
  c.assert(elapsedSeconds(result.data.updated_at) < 1)
  c.assertEqual(result.data.updated_by, id)

  await c.put({it: 'same update again yields 204', status: 204}, getPath, updateDoc)

  result = await c.get('can get updated doc', getPath)
  c.assertEqual(result.data.id, id)
  c.assertEqual(result.data.created_at, created.created_at)
  c.assertEqual(result.data.created_by, created.created_by)
  for (let key of keys(updateDoc)) {
    c.assertEqual(result.data[key], updateDoc[key])
  }
  for (let key of difference(keys(doc), keys(updateDoc))) {
    c.assertEqual(result.data[key], doc[key])
  }
  c.assert(elapsedSeconds(result.data.updated_at) < 1)
  c.assertEqual(result.data.updated_by, id)

  await c.delete({it: 'cannot delete without auth', status: 401}, getPath, anonymous)

  await c.delete('can delete doc', getPath)

  await c.get({it: 'cannot get deleted doc', status: 404}, getPath)

  await c.delete({it: 'trying to delete doc again', status: 404}, getPath)
}

module.exports = async function (c) {
  let result = await c.post('create space', '/spaces', {name: 'My CMS'})
  let space = result.data.key

  const model = {
    title: 'Article',
    space,
    model: {
      coll: 'articles',
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

  result = await c.post('create articles model', '/models', model)
  const modelId = result.data.id

  const article = {
    title: 'My first article',
    body: 'Welcome to my blog!'
  }
  const updateArticle = {
    title: 'Title changed'
  }
  await crudTest(c, `/data/${space}`, 'articles', article, updateArticle)

  const modelUpdated = setIn(model, ['model', 'schema', 'properties'], {title: {type: 'string'}, slug: {type: 'string'}})
  await c.put('update articles model with new schema property', `/models/${modelId}`, modelUpdated)

  const anotherArticle = {
    title: 'My second article',
    slug: 'my-second-article'
  }
  await c.post('create another article with new property', `/data/${space}/articles`, anotherArticle)

  await c.delete('delete articles model', `/models/${modelId}`)

  const thirdArticle = {
    title: 'My third article',
    slug: 'my-third-article'
  }
  await c.post({it: 'trying to create an article without model', status: 404}, `/data/${space}/articles`, thirdArticle)
}
