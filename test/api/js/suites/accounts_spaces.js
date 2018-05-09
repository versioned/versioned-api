module.exports = async function (c) {
  const {account, space, secondSpace, superHeaders} = c.data

  let result = await c.get('get account with relationships', `/accounts/${account.id}?relationships=1`)
  c.assertEqualKeys(['name', 'id'], result.data.spaces, [space, secondSpace])

  result = await c.get('list accounts with relationships as super user', `/accounts?relationships=1`, {headers: superHeaders})

  result = await c.get('get space with relationships', `/${account.id}/spaces/${space.id}?relationships=1`)
  c.assertEqual(result.data.accountId, account.id)
  c.assertEqualKeys(['name', 'id'], result.data.account, account)

  result = await c.get('list spaces with relationships', `/${account.id}/spaces?relationships=1`)
  c.assertEqual(result.data[0].accountId, account.id)
  c.assertEqualKeys(['name', 'id'], result.data[0].account, account)
  c.assertEqual(result.data[1].accountId, account.id)
  c.assertEqualKeys(['name', 'id'], result.data[1].account, account)
}
