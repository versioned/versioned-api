const {omit, keys, merge, range} = require('lib/util')
const config = require('app/config')

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
    name: 'Article',
    spaceId: spaceId,
    coll: 'articles',
    model
  }

  for (let property of keys(articleModel)) {
    await c.post({it: `create article model with missing ${property}`, status: 422}, '/models', omit(articleModel, [property]))
  }

  let result = await c.post('create article model', '/models', articleModel)
  const id = result.data.id
  await c.post({it: 'cannot create article model again with same coll', status: 422}, '/models', articleModel)

  await c.put({it: 'cannot change coll or spaceId of model', status: 204}, `/models/${id}`, {spaceId: 123, coll: 'foobar'})

  await c.post({it: 'cannot create article model with invalid schema - property type', status: 422}, '/models', merge(articleModel, {
    coll: c.uuid(),
    model: {
      schema: {
        type: 'object',
        properties: {
          title: {type: 'foobar'},
          body: {type: 'string'}
        },
        additionalProperties: false,
        required: ['title']
      }
    }
  }))

  await c.post({it: 'cannot create article model with invalid schema - x-meta property', status: 422}, '/models', merge(articleModel, {
    coll: c.uuid(),
    model: {
      schema: {
        type: 'object',
        properties: {
          title: {type: 'integer', 'x-meta': {'foobar': true}},
          body: {type: 'string'}
        },
        additionalProperties: false,
        required: ['title']
      }
    }
  }))

  const tooManyProperties = range(0, (config.PROPERTY_LIMIT + 1)).reduce((acc, i) => {
    acc[`property${i}`] = {type: 'string'}
    return acc
  }, {})
  await c.post({it: 'cannot create article model with too many properties', status: 422}, '/models', merge(articleModel, {
    coll: c.uuid(),
    model: {
      schema: {
        type: 'object',
        properties: tooManyProperties
      }
    }
  }))

  const limitProperties = range(0, config.PROPERTY_LIMIT).reduce((acc, i) => {
    acc[`property${i}`] = {type: 'string'}
    return acc
  }, {})
  let uuid = c.uuid()
  await c.post(`can create article model with ${config.PROPERTY_LIMIT} properties`, '/models', merge(articleModel, {
    name: `${articleModel.name} ${uuid}`,
    coll: uuid,
    model: {
      schema: {
        type: 'object',
        properties: limitProperties
      }
    }
  }))
}
