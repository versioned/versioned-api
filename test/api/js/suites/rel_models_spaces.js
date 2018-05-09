module.exports = async function (c) {
  const {account, model, space} = c.data

  let result = await c.get('get model with relationships', `/${account.id}/models/${model.id}?relationships=1`)
  c.assertEqual(result.data.spaceId, space.id)
  c.assertEqualKeys(['id', 'name'], result.data.space, space)

  result = await c.get('list models with relationships', `/${account.id}/models?relationships=1`)
  let data = result.data.find(m => m.id === model.id)
  c.assertEqual(data.spaceId, space.id)
  c.assertEqualKeys(['id', 'name'], data.space, space)

  result = await c.get('get space with relationships', `/${account.id}/spaces/${space.id}?relationships=1`)
  data = result.data.models.find(m => m.id === model.id)
  c.assertEqualKeys(['id', 'name'], data, model)

  result = await c.get('list spaces with relationships', `/${account.id}/spaces?relationships=1`)
  data = result.data.find(s => s.id === space.id)
  c.assertEqualKeys(['id', 'name'], data.models.find(m => m.id === model.id), model)
}
