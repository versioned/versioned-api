module.exports = async function (c) {
  const name = c.uuid()
  const user = {
    name,
    email: `${name}@example.com`,
    password: 'admin'
  }
  let result = await c.post('create user', `/users`, user)
  c.assertEqual(result.data.name, name)
  c.assertEqual(result.data.email, user.email)
  c.assert(c.isMongoId(result.data._id))
  const id = result.data.id

  result = await c.get({it: 'cannot get user without auth', status: 401}, `/users/${id}`)

  result = await c.post('can log in', `/login`, user)
  const headers = {authorization: `Bearer ${result.data.token}`}

  result = await c.get('can get user if authorized', `/users/${id}`, {headers})
  c.assertEqual(result.data.name, user.name)
  c.assertEqual(result.data.email, user.email)

  result = await c.get({it: 'cannot list users without auth', status: 401}, `/users`)

  result = await c.get('can list users with auth', `/users`, {headers})
  c.assertEqual(result.data[0].id, id)
  c.assertEqual(result.data[0].email, user.email)

  result = await c.put({it: 'cannot update user without auth', status: 401}, `/users/${id}`, {name: 'changed name'})

  result = await c.put('can update user with auth', `/users/${id}`, {name: 'changed name'}, {headers})

  result = await c.get('can get updated user', `/users/${id}`, {headers})
  c.assertEqual(result.data.name, 'changed name')
  c.assertEqual(result.data.email, user.email)

  result = await c.delete({it: 'cannot delete user without auth', status: 401}, `/users/${id}`)

  result = await c.delete('can delete user with auth', `/users/${id}`, {headers})

  result = await c.get({it: 'cannot get deleted user', status: 401}, `/users/${id}`, {headers})

  const adminUser = {
    name,
    email: `${c.uuid()}@example.com`,
    password: 'admin'
  }
  result = await c.post('create admin user', `/users`, adminUser)

  result = await c.post('log in admin user', `/login`, adminUser)
  const adminHeaders = {authorization: `Bearer ${result.data.token}`}

  result = await c.get({it: 'getting deleted user as admin', status: 404}, `/users/${id}`, {headers: adminHeaders})
}
