const {omit, merge, range} = require('lib/util')
const config = require('app/config')

module.exports = async function (c) {
  const accountId = c.data.account.id
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
    features: ['published'],
    model
  }

  const requiredProperties = ['name', 'spaceId', 'model']
  for (let property of requiredProperties) {
    await c.post({it: `create article model with missing required property ${property}`, status: 422}, `/${accountId}/models`, omit(articleModel, [property]))
  }

  let result = await c.post('create article model', `/${accountId}/models`, articleModel)
  const id = result.data.id
  await c.post({it: 'cannot create article model again with same coll', status: 422}, `/${accountId}/models`, articleModel)

  await c.put({it: 'cannot change coll or spaceId of model', status: 204}, `/${accountId}/models/${id}`, {spaceId: 123, coll: 'foobar'})

  await c.post({it: 'cannot create article model with invalid schema - property type', status: 422}, `/${accountId}/models`, merge(articleModel, {
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

  result = await c.post({it: 'cannot create article model with invalid x-meta property', status: 422}, `/${accountId}/models`, merge(articleModel, {
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
  c.assertEqual(result.body.errors[0].field, 'model.schema.properties.title.x-meta.foobar')

  await c.post({it: 'cannot create article model with reserved property name sys', status: 422}, `/${accountId}/models`, merge(articleModel, {
    name: c.uuid(),
    coll: c.uuid(),
    model: {
      schema: {
        type: 'object',
        properties: {
          title: {type: 'integer'},
          sys: {type: 'string'}
        },
        additionalProperties: false,
        required: ['title']
      }
    }
  }))

  await c.post({it: 'cannot create article model with reserved property name publishedVersion', status: 422}, `/${accountId}/models`, merge(articleModel, {
    name: c.uuid(),
    coll: c.uuid(),
    model: {
      schema: {
        type: 'object',
        properties: {
          title: {type: 'integer'},
          publishedVersion: {type: 'string'}
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
  await c.post({it: 'cannot create article model with too many properties', status: 422}, `/${accountId}/models`, merge(articleModel, {
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
  await c.post(`can create article model with ${config.PROPERTY_LIMIT} properties`, `/${accountId}/models`, merge(articleModel, {
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
