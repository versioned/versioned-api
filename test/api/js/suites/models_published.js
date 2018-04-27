const {crudTest} = require('../shared/models')

module.exports = async function (c) {
  const accountId = c.data.account.id
  const spaceId = c.data.space.id

  const model = {
    name: 'Items',
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

  let result = await c.post('create published model', `/${accountId}/models`, model)
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
  c.assertRecent(result.data.createdAt)
  c.assertEqual(result.data.createdBy, c.data.user.id)
  c.assert(!result.data.updatedAt)
  c.assert(!result.data.updatedBy)

  result = await c.get('get changelog', `/changelog`)
  c.assertEqual(result.data[0].action, 'create')
  c.assert(!result.data[0].changes)
  c.assertEqual(result.data[0].doc.id, id)
  c.assertEqual(result.data[0].doc.title, item.title)
  c.assertEqual(result.data[0].doc.version, 1)

  result = await c.get('get created item', `/data/${spaceId}/items/${id}`)
  c.assertEqual(result.data.id, id)
  c.assertEqual(result.data.title, item.title)
  c.assertEqual(result.data.version, 1)
  c.assert(!result.data.publishedVersion)
  c.assertRecent(result.data.createdAt)
  c.assertEqual(result.data.createdBy, c.data.user.id)
  c.assert(!result.data.updatedAt)
  c.assert(!result.data.updatedBy)

  result = await c.get('list items', `/data/${spaceId}/items`)
  c.assertEqual(result.data.length, 1)
  c.assertEqual(result.data[0].id, id)
  c.assertEqual(result.data[0].title, item.title)
  c.assertEqual(result.data[0].version, 1)
  c.assert(!result.data[0].publishedVersion)
  c.assertRecent(result.data[0].createdAt)
  c.assertEqual(result.data[0].createdBy, c.data.user.id)
  c.assert(!result.data[0].updatedAt)
  c.assert(!result.data[0].updatedBy)

  result = await c.get({it: 'ask for published version of item', status: 404}, `/data/${spaceId}/items/${id}?published=1`)

  result = await c.get('list published items', `/data/${spaceId}/items?published=1`)
  c.assertEqual(result.data.length, 0)

  result = await c.put('update item', `/data/${spaceId}/items/${id}`, {title: 'foobar1'})
  c.assertEqual(result.data.title, 'foobar1')
  c.assertEqual(result.data.version, 1)
  c.assert(!result.data.publishedVersion)
  c.assertRecent(result.data.updatedAt)

  result = await c.get('get changelog', `/changelog`)
  c.assertEqual(result.data[0].action, 'update')
  c.assertEqual(result.data[0].doc.id, id)
  c.assertEqual(result.data[0].doc.title, 'foobar1')
  c.assertEqual(result.data[0].doc.version, 1)
  c.assertEqual(result.data[0].changes, {title: {changed: {from: item.title, to: 'foobar1'}}})

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

  result = await c.get('get item with versions', `/data/${spaceId}/items/${id}?versions=1`)
  c.assertEqual(result.data.title, 'foobar2')
  c.assertEqual(result.data.version, 2)
  c.assertEqual(result.data.publishedVersion, 1)
  c.assertEqual(result.data.versions.length, 2)
  c.assertEqual(result.data.versions[0].id, id)
  c.assertEqual(result.data.versions[0].version, 2)
  c.assertEqual(result.data.versions[0].title, 'foobar2')
  c.assertRecent(result.data.versions[0].createdAt)
  c.assertEqual(result.data.versions[0].createdBy, c.data.user.id)
  c.assert(!result.data.versions[0].updatedAt)
  c.assert(!result.data.versions[0].updatedBy)
  c.assertEqual(result.data.versions[1].id, id)
  c.assertEqual(result.data.versions[1].version, 1)
  c.assertEqual(result.data.versions[1].title, 'foobar1')
  c.assertEqual(result.data.versions[1].createdBy, c.data.user.id)
  c.assertEqual(result.data.versions[1].updatedBy, c.data.user.id)
  c.assertRecent(result.data.versions[1].createdAt)
  c.assertRecent(result.data.versions[1].updatedAt)
  c.assert(new Date(result.data.versions[1].updatedAt) >= new Date(result.data.versions[1].createdAt))
  c.assert(new Date(result.data.versions[1].createdAt) >= new Date(result.data.versions[0].createdAt))

  result = await c.get('get published item', `/data/${spaceId}/items/${id}?published=1`)
  c.assertEqual(result.data.title, 'foobar1')
  c.assertEqual(result.data.version, 1)
  c.assertEqual(result.data.publishedVersion, 1)

  result = await c.get('list items', `/data/${spaceId}/items`)
  c.assertEqual(result.data.length, 1)
  c.assertEqual(result.data[0].id, id)
  c.assertEqual(result.data[0].title, 'foobar2')
  c.assertEqual(result.data[0].version, 2)
  c.assertEqual(result.data[0].publishedVersion, 1)

  result = await c.get('list published items', `/data/${spaceId}/items?published=1`)
  c.assertEqual(result.data.length, 1)
  c.assertEqual(result.data[0].id, id)
  c.assertEqual(result.data[0].title, 'foobar1')
  c.assertEqual(result.data[0].version, 1)
  c.assertEqual(result.data[0].publishedVersion, 1)

  result = await c.put('update again', `/data/${spaceId}/items/${id}`, {title: 'foobar3'})
  c.assertEqual(result.data.title, 'foobar3')
  c.assertEqual(result.data.version, 2)
  c.assertEqual(result.data.publishedVersion, 1)

  result = await c.put('publish item', `/data/${spaceId}/items/${id}`, {publishedVersion: 2})
  c.assertEqual(result.data.title, 'foobar3')
  c.assertEqual(result.data.version, 2)
  c.assertEqual(result.data.publishedVersion, 2)

  result = await c.get('get item', `/data/${spaceId}/items/${id}`)
  c.assertEqual(result.data.id, id)
  c.assertEqual(result.data.title, 'foobar3')
  c.assertEqual(result.data.version, 2)
  c.assertEqual(result.data.publishedVersion, 2)

  result = await c.get('get published item', `/data/${spaceId}/items/${id}?published=1`)
  c.assertEqual(result.data.id, id)
  c.assertEqual(result.data.title, 'foobar3')
  c.assertEqual(result.data.version, 2)
  c.assertEqual(result.data.publishedVersion, 2)

  result = await c.put('rollback item', `/data/${spaceId}/items/${id}`, {publishedVersion: 1})
  c.assertEqual(result.data.id, id)
  c.assertEqual(result.data.version, 2)
  c.assertEqual(result.data.publishedVersion, 1)

  result = await c.get('get item', `/data/${spaceId}/items/${id}`)
  c.assertEqual(result.data.id, id)
  c.assertEqual(result.data.title, 'foobar3')
  c.assertEqual(result.data.version, 2)
  c.assertEqual(result.data.publishedVersion, 1)

  result = await c.get('get published item', `/data/${spaceId}/items/${id}?published=1`)
  c.assertEqual(result.data.id, id)
  c.assertEqual(result.data.title, 'foobar1')
  c.assertEqual(result.data.version, 1)
  c.assertEqual(result.data.publishedVersion, 1)

  result = await c.put('unpublish item', `/data/${spaceId}/items/${id}`, {publishedVersion: null})
  c.assertEqual(result.data.version, 2)
  c.assert(!result.data.publishedVersion)

  result = await c.get('get changelog', `/changelog`)
  c.assertEqual(result.data[0].action, 'update')
  c.assertEqual(result.data[0].doc.id, id)
  c.assertEqual(result.data[0].doc.version, 2)
  c.assertEqual(result.data[0].changes, {publishedVersion: {deleted: 1}})

  result = await c.get('get item', `/data/${spaceId}/items/${id}`)
  c.assertEqual(result.data.id, id)
  c.assertEqual(result.data.title, 'foobar3')
  c.assertEqual(result.data.version, 2)
  c.assert(!result.data.publishedVersion)

  result = await c.get({it: 'get published item', status: 404}, `/data/${spaceId}/items/${id}?published=1`)
}
