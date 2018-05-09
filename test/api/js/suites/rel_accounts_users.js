const {property, compact} = require('lib/util')

module.exports = async function (c) {
  const {account, superHeaders} = c.data
  const userId = c.data.user.id
  let users = [{id: userId, role: 'admin'}]
  c.assertEqual(account.users, users)
  let result = await c.get('get user', `/users/${userId}`)
  const user = result.data
  c.assertEqual(user.accounts, [{id: account.id, role: 'admin'}])

  const newUser = c.makeUser()
  result = await c.post('create new user', `/users`, newUser)
  newUser.id = result.data.id

  users = users.concat({id: newUser.id, role: 'read'})
  result = await c.put('add new user to account', `/accounts/${account.id}`, {users})
  c.assertEqual(result.data.users, users)

  result = await c.get('get account', `/accounts/${account.id}`)
  c.assertEqual(result.data.users, users)

  result = await c.get('get account with relationships', `/accounts/${account.id}?relationships=1`)
  c.assertEqualKeys(['id', 'role'], result.data.users, users)
  c.assertEqualKeys(['id', 'email'], result.data.users, [user, newUser])
  c.assertEqual(compact(result.data.users.map(property('passwordHash'))), [])

  result = await c.get('list accounts with relationships', `/accounts?relationships=1`, {headers: superHeaders})
  let data = result.data.find(d => d.id === account.id)
  c.assertEqualKeys(['id', 'role'], data.users, users)
  c.assertEqualKeys(['id', 'email'], data.users, [user, newUser])

  result = await c.get('get user with relationships', `/users/${user.id}?relationships=1`)
  c.assertEqualKeys(['id', 'role'], result.data.accounts, [{id: account.id, role: 'admin'}])
  c.assertEqualKeys(['id', 'name'], result.data.accounts, [account])

  // result = await c.get('get new user', `/users/${newUser.id}`)
  // c.assertEqual(result.data.accounts, [{id: account.id, role: 'read'}])
  //
  // users = [{id: userId, role: 'admin'}, {id: newUser.id, role: 'write'}]
  // result = await c.put('change new user role in account', `/accounts/${account.id}`, {users})
  //
  // result = await c.get('get new user', `/users/${newUser.id}`)
  // c.assertEqual(result.data.accounts, [{id: account.id, role: 'write'}])
  //
  // users = [{id: userId, role: 'admin'}]
  // result = await c.put('remove new user from account', `/accounts/${account.id}`, {users})
  //
  // result = await c.get('get new user', `/users/${newUser.id}`)
  // c.assert(!result.data.accounts)
}
