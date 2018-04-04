const {merge} = require('lib/util')

module.exports = async function (c) {
  const name = c.uuid()
  const user = {
    name,
    email: `${name}@example.com`,
    password: 'admin'
  }
  let result = await c.post('valid create user', '/users', user)
  const id = result.data.id
  c.assertEqual(result.status, 200)
  c.assertEqual(result.data.name, user.name)
  c.assertEqual(result.data.email, user.email)

  result = await c.post('can log in', `/login`, user)
  const headers = {authorization: `Bearer ${result.data.token}`}

  result = await c.post({it: 'invalid create user - missing email', status: 422}, '/users', merge(user, {email: undefined}))

  result = await c.put({it: 'invalid update user - missing email', status: 422}, `/users/${id}`, {email: null}, {headers})
}
