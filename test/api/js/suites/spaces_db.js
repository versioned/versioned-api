const {merge} = require('lib/util')
const config = require('app/config')
const {crudTest} = require('../shared/models')

module.exports = async function (c) {
  const space = {
    name: 'My Dedicated CMS',
    databaseUrl: `${config.MONGODB_URL}_dedicated`
  }
  const sharedSpace = {
    name: 'My Shared CMS'
  }

  await c.post({it: 'create space with invalid databaseUrl', status: 422}, '/spaces', merge(space, {databaseUrl: 'foobar'}))

  let result = await c.post('create space with valid databaseUrl', '/spaces', space)
  c.assert(result.data.id)
  space.id = result.data.id

  const model = {
    title: 'Article',
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

  result = await c.post('can create space in shared database', '/spaces', sharedSpace)
  c.assert(result.data.id)
  sharedSpace.id = result.data.id

  const sharedModel = merge(model, {spaceId: sharedSpace.id})

  await c.post('create model in dedicated space', '/models', model)
  c.assert(result.data.id)
  model.id = result.data.id

  await c.post('create same model in shared space', '/models', sharedModel)
  c.assert(result.data.id)
  sharedModel.id = result.data.id

  await crudTest(c, `/data/${space.id}`, model.coll, article, updateArticle)

  await c.post('create an article in the dedicated space', `/data/${space.id}/articles`, article)

  await c.post('create an article in the shared space', `/data/${sharedSpace.id}/articles`, article)
}
