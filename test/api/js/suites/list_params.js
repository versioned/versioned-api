const {property} = require('lib/util')
const {secondsFrom} = require('lib/date_util')

module.exports = async function (c) {
  const {account, space, secondSpace} = c.data
  let result = await c.get('list spaces limit=1', `/${account.id}/spaces?limit=1`)
  c.assertEqual(result.data.length, 1)
  c.assertEqualKeys(['id', 'name'], result.data[0], space)

  result = await c.get('list spaces limit=1&skip=1', `/${account.id}/spaces?limit=1&skip=1`)
  c.assertEqual(result.data.length, 1)
  c.assertEqualKeys(['id', 'name'], result.data[0], secondSpace)

  result = await c.get('list spaces limit=1&sort=createdAt', `/${account.id}/spaces?limit=1&sort=createdAt`)
  c.assertEqual(result.data.length, 1)
  c.assertEqualKeys(['id', 'name'], result.data[0], space)

  result = await c.get('list spaces filter.name=&filter.dbKey=', `/${account.id}/spaces?filter.name=${space.name}&filter.dbKey=${space.dbKey}`)
  c.assertEqual(result.data.length, 1)
  c.assertEqualKeys(['id', 'name'], result.data[0], space)

  result = await c.get('list spaces filter.id=', `/${account.id}/spaces?filter.id=${space.id}`)
  c.assertEqual(result.data.length, 1)
  c.assertEqualKeys(['id', 'name'], result.data[0], space)

  result = await c.get('list spaces filter.id[ne]=', `/${account.id}/spaces?filter.id[ne]=${space.id}`)
  c.assert(result.data.length > 0)
  c.assert(!result.data.map(property('id')).includes(space.id))

  c.assert(space.name)
  result = await c.get('list spaces filter.name[exists]=1', `/${account.id}/spaces?filter.name[exists]=1`)
  c.assert(result.data.length > 0)
  c.assert(result.data.map(property('id')).includes(space.id))

  result = await c.get('list spaces filter.name[exists]=0', `/${account.id}/spaces?filter.name[exists]=0`)
  c.assert(!result.data.map(property('id')).includes(space.id))

  result = await c.get('list spaces filter.name[in]=', `/${account.id}/spaces`, {params: {
    'filter.name[in]': `${space.name},${secondSpace.name}`
  }})
  c.assertEqual(result.data.length, 2)
  c.assertEqualKeys(['id', 'name'], result.data[0], space)
  c.assertEqualKeys(['id', 'name'], result.data[1], secondSpace)

  const compareTime = secondsFrom(new Date(space.createdAt), 1)
  result = await c.get('list spaces filter.createdAt[lt]=', `/${account.id}/spaces?filter.createdAt[lt]=${compareTime}`)
  c.assert(result.data.length > 0)
  c.assert(result.data.map(property('id')).includes(space.id))

  result = await c.get('list spaces filter.createdAt[gt]=', `/${account.id}/spaces?filter.createdAt[gt]=${compareTime}`)
  c.assert(!result.data.map(property('id')).includes(space.id))
}
