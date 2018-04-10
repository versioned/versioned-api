const {omit, keys} = require('lib/util')

module.exports = async function (c) {
  const spaceId = c.data.space.id

  const model = {
    schema: {
      type: 'object',
      properties: {
        title: {type: 'string'},
        body: {type: 'string'}
      },
      additionalProperties: false,
      required: ['title']
    }
  }

  const articleModel = {
    title: 'Article',
    space_id: spaceId,
    coll: 'articles',
    model
  }

  for (let property of keys(articleModel)) {
    await c.post({it: `create article model with missing ${property}`, status: 422}, '/models', omit(articleModel, [property]))
  }

  let result = await c.post('create article model', '/models', articleModel)
  const id = result.data.id
  await c.post({it: 'cannot create article model again with same coll', status: 422}, '/models', articleModel)

  await c.put({it: 'cannot change coll or space_id of model', status: 204}, `/models/${id}`, {space_id: 123, coll: 'foobar'})
}
