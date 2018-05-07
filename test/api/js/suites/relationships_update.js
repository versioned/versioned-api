const {relationshipsModel} = require('../shared/relationships')

module.exports = async function (c) {
  const accountId = c.data.account.id
  let result = await c.post('create space for relationships update test', `/${accountId}/spaces`, {name: 'Relationships Update Test', accountId: accountId})
  const spaceId = result.data.id

  const {Author, Article, Category} = relationshipsModel(spaceId)

  result = await c.post('create authors model', `/${accountId}/models`, Author)
  result = await c.post('create articles model', `/${accountId}/models`, Article)
  result = await c.post('create categories model', `/${accountId}/models`, Category)

  // TODO: update/delete/add from three rel types
}
