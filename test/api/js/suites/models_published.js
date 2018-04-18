const {crudTest} = require('../shared/models')

module.exports = async function (c) {
  const spaceId = c.data.space.id

  const model = {
    title: 'Items',
    spaceId: spaceId,
    coll: 'items',
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
    },
    features: ['published']
  }

  let result = await c.post('create published model', '/models', model)
  const modelId = result.data.id
  c.assert(modelId)

  const item = {
    title: 'My first item',
    body: 'Welcome to my blog!'
  }
  const updateItem = {
    title: 'Item changed'
  }
  await crudTest(c, `/data/${spaceId}`, 'items', item, updateItem)

  result = await c.post('create item', `/data/${spaceId}/items`, item)
  const id = result.data.id
  c.assert(id)
  c.assertEqual(result.data.title, item.title)
  c.assertEqual(result.data.version, 1)
  c.assert(!result.data.publishedVersion)
  // TODO: check audit attributes etc.

  result = await c.get('get created item', `/data/${spaceId}/items/${id}`)
  c.assertEqual(result.data.id, id)
  c.assertEqual(result.data.title, item.title)
  c.assertEqual(result.data.version, 1)
  c.assert(!result.data.publishedVersion)
  // TODO: check audit attributes etc.

  result = await c.get('list items', `/data/${spaceId}/items`)
  c.assertEqual(result.data.length, 1)
  c.assertEqual(result.data[0].id, id)
  c.assertEqual(result.data[0].title, item.title)
  c.assertEqual(result.data[0].version, 1)
  c.assert(!result.data[0].publishedVersion)

  // TODO: get published item -> 404
  // TODO: list published items -> []

  result = await c.put('update item', `/data/${spaceId}/items/${id}`, {title: 'foobar1'})
  c.assertEqual(result.data.title, 'foobar1')
  c.assertEqual(result.data.version, 1)
  c.assert(!result.data.publishedVersion)

  result = await c.get('get updated item', `/data/${spaceId}/items/${id}`)
  c.assertEqual(result.data.title, 'foobar1')

  result = await c.put('publish item', `/data/${spaceId}/items/${id}`, {publishedVersion: 2})
  c.assertEqual(result.data.title, 'foobar1')
  c.assertEqual(result.data.version, 1)
  c.assertEqual(result.data.publishedVersion, 1)

  result = await c.put('update published item', `/data/${spaceId}/items/${id}`, {title: 'foobar2'})
  c.assertEqual(result.data.title, 'foobar2')
  c.assertEqual(result.data.version, 2)
  c.assertEqual(result.data.publishedVersion, 1)

  // TODO
  // get item -> version=2
  // get published item -> version=1
  // list items -> version=2
  // list published items -> version=1

  result = await c.put('update again', `/data/${spaceId}/items/${id}`, {title: 'foobar3'})
  c.assertEqual(result.data.title, 'foobar3')
  c.assertEqual(result.data.version, 2)
  c.assertEqual(result.data.publishedVersion, 1)

  result = await c.put('publish item', `/data/${spaceId}/items/${id}`, {publishedVersion: 2})
  c.assertEqual(result.data.title, 'foobar3')
  c.assertEqual(result.data.version, 2)
  c.assertEqual(result.data.publishedVersion, 2)

  result = await c.put('rollback item', `/data/${spaceId}/items/${id}`, {publishedVersion: 1})
  c.assertEqual(result.data.version, 2)
  c.assertEqual(result.data.publishedVersion, 1)

  result = await c.put('unpublish item', `/data/${spaceId}/items/${id}`, {publishedVersion: null})
  c.assertEqual(result.data.version, 2)
  c.assert(!result.data.publishedVersion)
}
