module.exports = async function (c) {
  await c.post({it: 'create user invalid json', status: 400}, `/users`, '{foobar')
  await c.put({it: 'update user invalid json', status: 400}, `/users/${c.data.user.id}`, '{foobar')

  await c.post({it: 'create user unknown property', status: 422}, `/users`, {foo: 'bar'})
  await c.put({it: 'update user unknown property', status: 422}, `/users/${c.data.user.id}`, {foo: 'bar'})

  await c.post({it: 'create user invalid property type', status: 422}, `/users`, {password: 123456})
  await c.put({it: 'update user invalid property type', status: 422}, `/users/${c.data.user.id}`, {password: 123456})

  await c.put({it: 'update user - missing user', status: 404}, `/users/123456`, {name: 'new name'})
}
