const {relationshipsModel} = require('../shared/relationships')

module.exports = async function (c) {
  const accountId = c.data.account.id

  let result = await c.post('create space for relationships delete test', `/${accountId}/spaces`, {name: 'Relationshis Delete Test', accountId: accountId})
  const spaceId = result.data.id

  const {Article} = relationshipsModel(spaceId)

  result = await c.post('create model in space', `/${spaceId}/models`, Article)
  const modelId = result.data.id

  result = await c.delete('deleting the space should also delete the model', `/${accountId}/spaces/${spaceId}`)

  result = await c.get({it: 'the model is gone', status: 404}, `/${spaceId}/models/${modelId}`)

  result = await c.get({it: 'the space is gone', status: 404}, `/${accountId}/spaces/${spaceId}`)
}
