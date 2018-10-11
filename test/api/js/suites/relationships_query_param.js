const {notEmpty} = require('lib/util')

module.exports = async function (c) {
  const {user} = c.data
  let result = await c.get('fetch user with relationshipLevels=2', `/users/${user.id}?relationshipLevels=2`)
  c.assert(notEmpty(result.data.accounts))
  c.assert(result.data.accounts[0].spaces.length >= 2)
  const firstSpace = result.data.accounts[0].spaces[0]
  const secondSpace = result.data.accounts[0].spaces[1]

  let relationshipParams = {'accounts.spaces': {limit: 1}}
  result = await c.get('fetch user with relationshipLevels=2 accounts.spaces limit=1', `/users/${user.id}?relationshipLevels=2&relationshipParams=${JSON.stringify(relationshipParams)}`)
  c.assert(notEmpty(result.data.accounts))
  c.assertEqual(result.data.accounts[0].spaces.length, 1)

  relationshipParams = {'accounts.spaces': {limit: 2, 'filter.name': secondSpace.name}}
  result = await c.get('fetch user with relationshipLevels=2 accounts.spaces filter.name = secondSpace.name', `/users/${user.id}?relationshipLevels=2&relationshipParams=${JSON.stringify(relationshipParams)}`)
  c.assert(notEmpty(result.data.accounts))
  c.assertEqual(result.data.accounts[0].spaces.length, 1)
  c.assertEqual(result.data.accounts[0].spaces[0].name, secondSpace.name)

  relationshipParams = {'accounts.spaces': {limit: 2, 'filter.name': firstSpace.name}}
  result = await c.get('fetch user with relationshipLevels=2 accounts.spaces filter.name = firstSpace.name', `/users/${user.id}?relationshipLevels=2&relationshipParams=${JSON.stringify(relationshipParams)}`)
  c.assert(notEmpty(result.data.accounts))
  c.assertEqual(result.data.accounts[0].spaces.length, 1)
  c.assertEqual(result.data.accounts[0].spaces[0].name, firstSpace.name)
}
