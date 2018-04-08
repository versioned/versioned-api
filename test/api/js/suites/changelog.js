const {elapsedSeconds} = require('lib/date_util')

module.exports = async function (c) {
  const user = {
    name: c.uuid(),
    email: `${c.uuid()}@example.com`,
    password: 'admin'
  }
  let result = await c.post('create another user', `/sys_users`, user)
  const id = result.data.id

  result = await c.get({it: 'list changelog without auth', status: 401}, `/sys_changelog`, {headers: {authorization: null}})

  result = await c.get('list changelog', `/sys_changelog`)
  let changelogId = result.data[0].id
  c.assertEqual(result.data[0].action, 'create')
  c.assert(!result.data[0].changes)
  c.assertEqual(result.data[0].doc.id, id)
  c.assertEqual(result.data[0].doc.name, user.name)
  c.assertEqual(result.data[0].doc.email, user.email)

  result = await c.get({it: 'get changelog without auth', status: 401}, `/sys_changelog/${changelogId}`, {headers: {authorization: null}})

  result = await c.get('get changelog', `/sys_changelog/${changelogId}`)
  c.assertEqual(result.data.id, changelogId)
  c.assertEqual(result.data.action, 'create')
  c.assertEqual(result.data.doc.id, id)
  c.assertEqual(result.data.doc.name, user.name)
  c.assertEqual(result.data.doc.email, user.email)
  c.assert(elapsedSeconds(result.data.created_at) < 1)
  c.assert(result.data.created_by, c.data.user.id)

  result = await c.put({it: 'there is no changelog update', status: 404}, `/sys_changelog/${changelogId}`, {})

  result = await c.put('update name', `/sys_users/${id}`, {name: 'changed name'})

  result = await c.get('list changelog', `/sys_changelog`)
  c.assertEqual(result.data[0].action, 'update')
  c.assertEqual(result.data[0].doc.id, id)
  c.assertEqual(result.data[0].doc.name, 'changed name')
  c.assertEqual(result.data[0].doc.email, user.email)
  c.assert(elapsedSeconds(result.data[0].created_at) < 1)
  c.assertEqual(result.data[0].created_by, c.data.user.id)
  c.assertEqual(result.data[0].changes, {name: {changed: {from: user.name, to: 'changed name'}}})

  result = await c.delete('delete user', `/sys_users/${id}`)

  result = await c.get('list changelog', `/sys_changelog`)
  c.assertEqual(result.data[0].action, 'delete')
  c.assertEqual(result.data[0].doc.id, id)
  c.assertEqual(result.data[0].doc.name, 'changed name')
  c.assertEqual(result.data[0].doc.email, user.email)
  c.assert(elapsedSeconds(result.data[0].created_at) < 1)
  c.assertEqual(result.data[0].created_by, c.data.user.id)
  c.assert(!result.data[0].changes)
}
