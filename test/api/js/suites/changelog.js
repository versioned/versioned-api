const {elapsedSeconds} = require('lib/date_util')

module.exports = async function (c) {
  const adminUser = {
    name: c.uuid(),
    email: `${c.uuid()}@example.com`,
    password: 'admin'
  }
  let result = await c.post('create admin user', `/users`, adminUser)
  const adminId = result.data.id

  result = await c.post('log in admin user', `/login`, adminUser)
  const headers = {authorization: `Bearer ${result.data.token}`}

  const user = {
    name: c.uuid(),
    email: `${c.uuid()}@example.com`,
    password: 'admin'
  }
  result = await c.post('create another user', `/users`, user, {headers})
  const id = result.data.id

  result = await c.get({it: 'list changelog without auth', status: 401}, `/changelog`)

  result = await c.get('list changelog', `/changelog`, {headers})
  let changelogId = result.data[0].id
  c.assertEqual(result.data[0].action, 'create')
  c.assert(!result.data[0].changes)
  c.assertEqual(result.data[0].doc.id, id)
  c.assertEqual(result.data[0].doc.name, user.name)
  c.assertEqual(result.data[0].doc.email, user.email)

  result = await c.get({it: 'get changelog without auth', status: 401}, `/changelog/${changelogId}`)

  result = await c.get('get changelog', `/changelog/${changelogId}`, {headers})
  c.assertEqual(result.data.id, changelogId)
  c.assertEqual(result.data.action, 'create')
  c.assertEqual(result.data.doc.id, id)
  c.assertEqual(result.data.doc.name, user.name)
  c.assertEqual(result.data.doc.email, user.email)
  c.assert(elapsedSeconds(result.data.created_at) < 1)
  c.assert(result.data.created_by, adminId)

  result = await c.put({it: 'there is no changelog update', status: 404}, `/changelog/${changelogId}`, {}, {headers})

  result = await c.put('update name', `/users/${id}`, {name: 'changed name'}, {headers})

  result = await c.get('list changelog', `/changelog`, {headers})
  c.assertEqual(result.data[0].action, 'update')
  c.assertEqual(result.data[0].doc.id, id)
  c.assertEqual(result.data[0].doc.name, 'changed name')
  c.assertEqual(result.data[0].doc.email, user.email)
  c.assert(elapsedSeconds(result.data[0].created_at) < 1)
  c.assertEqual(result.data[0].created_by, adminId)
  c.assertEqual(result.data[0].changes, {name: {changed: {from: user.name, to: 'changed name'}}})

  result = await c.delete('delete user', `/users/${id}`, {headers})

  result = await c.get('list changelog', `/changelog`, {headers})
  c.assertEqual(result.data[0].action, 'delete')
  c.assertEqual(result.data[0].doc.id, id)
  c.assertEqual(result.data[0].doc.name, 'changed name')
  c.assertEqual(result.data[0].doc.email, user.email)
  c.assert(elapsedSeconds(result.data[0].created_at) < 1)
  c.assertEqual(result.data[0].created_by, adminId)
  c.assert(!result.data[0].changes)
}
