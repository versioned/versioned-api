module.exports = async function (c) {
  const name = c.uuid()
  const user = {
    name,
    email: `${name}@example.com`,
    password: 'admin'
  }
  let result = await c.post('create user', '/sys_users', user)
  const id = result.data.id

  result = await c.post('valid login', '/sys_login', user)
  const headers = {authorization: `Bearer ${result.data.token}`}

  result = await c.get('get user', `/sys_users/${id}`, {headers})
  c.assertEqual(result.data.id, id)
  c.assertEqual(result.data.name, user.name)
  c.assertEqual(result.data.email, user.email)

  result = await c.get({it: 'unauthorized get user', status: 401}, `/sys_users/${id}`, {headers: {authorization: null}})

  result = await c.post({it: 'invalid password login', status: 401}, '/sys_login', {email: user.email, password: 'foobar'})

  result = await c.post({it: 'invalid email login', status: 401}, '/sys_login', {email: 'foo@example.com', password: user.password})
}
