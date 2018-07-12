module.exports = async function (c) {
  const name = c.uuid()
  const user = {
    name,
    email: `${name}@example.com`,
    password: 'admin'
  }
  let result = await c.post('create user', '/users', user)
  user.id = result.data.id

  result = await c.post('valid login', '/login', user)
  const headers = {authorization: `Bearer ${result.data.token}`}

  result = await c.get('get user', `/users/${user.id}`, {headers})
  c.assertEqual(result.data.id, user.id)
  c.assertEqual(result.data.name, user.name)
  c.assertEqual(result.data.email, user.email)

  result = await c.get({it: 'unauthorized get user', status: 401}, `/users/${user.id}`, {headers: {authorization: null}})

  result = await c.post({it: 'invalid password login', status: 401}, '/login', {email: user.email, password: 'foobar'})

  result = await c.post({it: 'invalid email login', status: 401}, '/login', {email: 'foo@example.com', password: user.password})

  result = await c.post('valid login with getUser=1', '/login?getUser=1', user)
  c.assert(result.data.token)
  c.assertEqual(result.data.user.id, user.id)
  c.assertEqual(result.data.user.email, user.email)
}
