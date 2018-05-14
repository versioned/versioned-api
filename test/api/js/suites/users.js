const {merge} = require('lib/util')

function makeUser (c) {
  const name = c.uuid()
  return {
    name,
    email: `${name}@example.com`,
    password: 'admin'
  }
}

module.exports = async function (c) {
  const {account, space} = c.data
  const user = makeUser(c)
  let result = await c.post('valid create user', '/users', user)
  const id = result.data.id
  c.assertEqual(result.status, 200)
  c.assertEqual(result.data.name, user.name)
  c.assertEqual(result.data.email, user.email)

  result = await c.post('can log in', `/login`, {email: user.email, password: user.password})
  const headers = {authorization: `Bearer ${result.data.token}`}

  result = await c.post({it: 'invalid create user - missing email', status: 422}, '/users', merge(user, {email: undefined}))

  result = await c.put({it: 'invalid update user - missing email', status: 422}, `/users/${id}`, {email: null}, {headers})

  const newEmail = `changed-${user.email}`
  result = await c.put('valid update user - new email', `/users/${id}`, {email: newEmail}, {headers})

  result = await c.post('can log in after update with new email and old password', `/login`, {email: newEmail, password: user.password})

  const newPassword = `changed-${user.password}`
  result = await c.put('valid update user - new password', `/users/${id}`, {password: newPassword}, {headers})

  result = await c.post('can log in after update with new email and new password', `/login`, {email: newEmail, password: newPassword})

  result = await c.post({it: 'cannot log in with old password', status: 401}, `/login`, {email: newEmail, password: user.password})

  await c.put('set defaultSpaceId', `/users/${id}`, {defaultSpaceId: space.id}, {headers})

  result = await c.get('get user with relationships', `/users/${id}?relationshipLevels=1`, {headers})
  c.assertEqual(result.data.defaultSpaceId, space.id)
  c.assertEqualKeys(['id', 'name'], result.data.defaultSpace, space)

  const accountUser = merge(makeUser(c), {accounts: [{role: 'read', id: account.id}]})
  result = await c.post('create user for account with default space', '/users', accountUser)
  accountUser.id = result.data.id
  c.assertEqual(result.data.email, accountUser.email)
  c.assertEqual(result.data.accounts, accountUser.accounts)
  c.assert(result.data.defaultSpaceId)

  result = await c.get('get account user', `/users/${accountUser.id}?relationships=defaultSpace`)
  c.assertEqual(result.data.defaultSpace.accountId, account.id)
}
