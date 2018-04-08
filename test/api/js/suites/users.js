const {merge} = require('lib/util')

module.exports = async function (c) {
  const name = c.uuid()
  const user = {
    name,
    email: `${name}@example.com`,
    password: 'admin'
  }
  let result = await c.post('valid create user', '/sys_users', user)
  const id = result.data.id
  c.assertEqual(result.status, 200)
  c.assertEqual(result.data.name, user.name)
  c.assertEqual(result.data.email, user.email)

  result = await c.post('can log in', `/sys_login`, {email: user.email, password: user.password})
  const headers = {authorization: `Bearer ${result.data.token}`}

  result = await c.post({it: 'invalid create user - missing email', status: 422}, '/sys_users', merge(user, {email: undefined}))

  result = await c.put({it: 'invalid update user - missing email', status: 422}, `/sys_users/${id}`, {email: null}, {headers})

  const newEmail = `changed-${user.email}`
  result = await c.put('valid update user - new email', `/sys_users/${id}`, {email: newEmail}, {headers})

  result = await c.post('can log in after update with new email and old password', `/sys_login`, {email: newEmail, password: user.password})

  const newPassword = `changed-${user.password}`
  result = await c.put('valid update user - new password', `/sys_users/${id}`, {password: newPassword}, {headers})

  result = await c.post('can log in after update with new email and new password', `/sys_login`, {email: newEmail, password: newPassword})

  result = await c.post({it: 'cannot log in with old password', status: 401}, `/sys_login`, {email: newEmail, password: user.password})
}
