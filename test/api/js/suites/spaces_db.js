const {merge} = require('lib/util')
const {crudTest} = require('../shared/models')

module.exports = async function (c) {
  const accountId = c.data.account.id
  const space = {
    name: 'My Dedicated CMS',
    accountId: c.data.account.id,
    mongodbUrl: c.DEDICATED_MONGODB_URL
  }
  const sharedSpace = {
    name: 'My Shared CMS',
    accountId: c.data.account.id
  }

  await c.post({it: 'create space with invalid mongodbUrl', status: 422}, `/${accountId}/spaces`, merge(space, {mongodbUrl: 'foobar'}))

  let result = await c.post('create space with valid mongodbUrl', `/${accountId}/spaces`, space)
  c.assert(result.data.id)
  space.id = result.data.id

  const model = {
    name: 'Article',
    spaceId: space.id,
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
  const article = {
    title: 'My first article',
    body: 'Welcome to my blog!'
  }
  const updateArticle = {
    title: 'Title changed'
  }

  result = await c.post('can create space in shared database', `/${accountId}/spaces`, sharedSpace)
  c.assert(result.data.id)
  sharedSpace.id = result.data.id

  const sharedModel = merge(model, {spaceId: sharedSpace.id})

  await c.post('create model in dedicated space', `/${space.id}/models`, model)
  c.assert(result.data.id)
  model.id = result.data.id

  await c.post('create same model in shared space', `/${sharedSpace.id}/models`, sharedModel)
  c.assert(result.data.id)
  sharedModel.id = result.data.id

  await crudTest(c, `/data/${space.id}`, model.coll, article, updateArticle)

  result = await c.post('create an article in the dedicated space', `/data/${space.id}/articles`, article)
  let id = result.data.id

  await c.get('get article in the dedicated space', `/data/${space.id}/articles/${id}`)

  await c.get({it: 'get article in the dedicated space with invalid space ID', status: 404}, `/data/12345/articles/${id}`)

  await c.post('create an article in the shared space', `/data/${sharedSpace.id}/articles`, article)
}
