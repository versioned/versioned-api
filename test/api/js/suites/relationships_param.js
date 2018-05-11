module.exports = async function (c) {
  const {user, account, space, secondSpace} = c.data
  let result = await c.get('fetch user with only defaultSpace relationship', `/users/${user.id}?relationships=defaultSpace`)
  c.assertEqual(result.data.defaultSpace.id, user.defaultSpaceId)
  c.assert(result.data.defaultSpace.name)
  c.assertEqual(result.data.accounts, user.accounts)

  result = await c.get('fetch user with nested defaultSpace and accounts relationships', `/users/${user.id}?relationships=defaultSpace.models,accounts.spaces.models`)
  c.assertEqual(result.data.defaultSpace.id, user.defaultSpaceId)
  c.assert(result.data.defaultSpace.name)
  c.assertEqualKeys(['id', 'name'], result.data.accounts, [account])
  c.assertEqualKeys(['id', 'name'], result.data.accounts[0].spaces.slice(0, 2), [space, secondSpace])
}
