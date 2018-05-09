module.exports = async function (c) {
  const account = c.data.account
  const users = account.users.concat({id: 'invalid', role: 'read'})
  await c.put({it: 'cannot add user with invalid id to account', status: 422}, `/accounts/${account.id}`, {users})
}
