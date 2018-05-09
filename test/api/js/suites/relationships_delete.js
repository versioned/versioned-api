const {relationshipsModel} = require('../shared/relationships')

module.exports = async function (c) {
  const accountId = c.data.account.id

  let result = await c.post('create space for relationships delete test', `/${accountId}/spaces`, {name: 'Relationshis Delete Test', accountId: accountId})
  const spaceId = result.data.id

  const {Article} = relationshipsModel(spaceId)

  result = await c.post('create model in space', `/${accountId}/models`, Article)
  const modelId = result.data.id

  result = await c.delete({it: 'attempting to delete the space should yield a validation error as the model requires it', status: 422}, `/${accountId}/spaces/${spaceId}`)

  result = await c.get('the model is still there', `/${accountId}/models/${modelId}`)

  result = await c.get('the space is still there', `/${accountId}/spaces/${spaceId}`)
}
