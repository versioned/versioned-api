const {concat} = require('lib/util')
const DEFAULTS = require('lib/model_spec').DEFAULTS

module.exports = async function (c) {
  // TODO: create a model with integer_id sequence
  const spaceId = c.data.space.id
  const coll = c.uuid()
  const model = {
    title: 'Integer ID Model',
    spaceId: spaceId,
    coll,
    model: {
      features: concat(['integer_id'], DEFAULTS.features),
      schema: {
        type: 'object',
        properties: {
          title: {type: 'string'},
          body: {type: 'string'}
        },
        required: ['title'],
        additionalProperties: false
      }
    }
  }
  let result = await c.post('create integer id model', '/models', model)

  let startIndex = null
  let maxId = 0
  for (let i = 0; i < 3; ++i) {
    let result = await c.post(`create doc ${i}`, `/data/${spaceId}/${coll}`, {title: c.uuid()})
    if (startIndex == null) startIndex = result.data.id
    c.assertEqual(result.data.id, startIndex + i)
    if (result.data.id > maxId) maxId = result.data.id
  }

  await c.delete('delete last created doc', `/data/${spaceId}/${coll}/${maxId}`)

  result = await c.post(`create another doc`, `/data/${spaceId}/${coll}`, {title: c.uuid()})
  c.assertEqual(result.data.id, maxId + 1)
  let lastDoc = result.data

  result = await c.get(`get doc by id`, `/data/${spaceId}/${coll}/${lastDoc.id}`)
  c.assertEqual(result.data.id, lastDoc.id)
  c.assertEqual(result.data.title, lastDoc.title)
}
