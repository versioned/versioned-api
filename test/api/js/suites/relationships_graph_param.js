const {keys} = require('lib/util')

module.exports = async function (c) {
  const {user, account, space, secondSpace} = c.data
  let graph = '{defaultSpace}'
  let result = await c.get('fetch user with only defaultSpace relationship', `/users/${user.id}?graph=${graph}`)
  c.assertEqual(['id', 'type', 'defaultSpaceId', 'defaultSpace'].sort(), keys(result.data).sort())
  c.assertEqualKeys(['id', 'type', 'defaultSpaceId'], result.data, user)
  c.assertEqualKeys(['id', 'type', 'name'], result.data.defaultSpace, space)

  graph = '{name,defaultSpace{name,models},accounts{name,spaces}}'
  result = await c.get('fetch user with nested defaultSpace and accounts relationships', `/users/${user.id}?graph=${graph}`)
  c.assertEqual(['id', 'type', 'name', 'defaultSpaceId', 'defaultSpace', 'accounts'].sort(), keys(result.data).sort())
  c.assertEqualKeys(['id', 'type', 'defaultSpaceId'], result.data, user)
  c.assertEqualKeys(['id', 'type', 'name'], result.data.defaultSpace, space)
  c.assert(result.data.defaultSpace.models)
  c.assertEqualKeys(['id', 'name'], result.data.accounts, [account])
  c.assertEqualKeys(['id', 'name'], result.data.accounts[0].spaces.slice(0, 2), [space, secondSpace])
}
