module.exports = async function (c) {
  const accountId = c.data.account.id
  let result = await c.post('you cannot hack the accountId scope when creating a space', `/${accountId}/spaces`, {name: 'Relationships Validate Test', accountId: 'foobar'})
  const space = result.data
  c.assertEqual(space.accountId, accountId)

  result = await c.post({it: 'you cannot hack the spaceId scope when creating a model', status: 422}, `/${space.id}/models`, {name: 'Super Model', spaceId: 'foobar'})
}
