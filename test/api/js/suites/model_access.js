const {elapsedSeconds} = require('lib/date_util')

module.exports = async function (c) {
  const name = c.uuid()
  const user = {
    name,
    email: `${name}@example.com`,
    password: 'admin'
  }
  let result = await c.post('valid create user', '/users', user)
  c.assert(!result.data.password)
  c.assert(!result.data.password_hash)
  const createdAt = result.data.created_at
  const id = result.data.id
  c.assert(id)
  c.assert(elapsedSeconds(createdAt) < 1)

  result = await c.post('valid login', '/login', user)
  const headers = {authorization: `Bearer ${result.data.token}`}
  c.assert(result.data.token)
  c.assert(result.data.user)
  c.assert(!result.data.user.password)
  c.assert(!result.data.user.password_hash)

  result = await c.put({it: 'attempted update of created_at', status: 204}, `/users/${id}`, {created_at: new Date()}, {headers})

  result = await c.get('get user', `/users/${id}`, {headers})
  c.assertEqual(result.data.created_at, createdAt)
  c.assert(!result.data.password)
  c.assert(!result.data.password_hash)
}
