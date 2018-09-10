module.exports = async function (c) {
  const accountId = c.data.account.id

  let result = await c.post('create space for sequence test', `/${accountId}/spaces`, {name: 'Sequence Test', accountId: accountId})
  const spaceId = result.data.id

  const model = {
    name: 'Model with Sequences',
    // coll: 'model_with_sequences',
    model: {
      schema: {
        type: 'object',
        'x-meta': {
          idSequence: true
        },
        properties: {
          title: {type: 'string'},
          sequence: {type: 'integer', 'x-meta': {sequence: true}}
        },
        additionalProperties: false
      }
    }
  }

  result = await c.post('create articles model', `/${spaceId}/models`, model)
  model.coll = result.data.coll

  result = await c.post('create first doc with default id/sequence', `/data/${spaceId}/${model.coll}`, {title: 'first doc'})
  let id = result.data.id
  result = await c.get('get first doc', `/data/${spaceId}/${model.coll}/${id}`)
  c.assertEqual(result.data.id, '1')
  c.assertEqual(result.data.sequence, 1)

  result = await c.post('create second doc with default id/sequence', `/data/${spaceId}/${model.coll}`, {title: 'second doc'})
  id = result.data.id
  result = await c.get('get second doc', `/data/${spaceId}/${model.coll}/${id}`)
  c.assertEqual(result.data.id, '2')
  c.assertEqual(result.data.sequence, 2)

  result = await c.post('create third doc with custom id/sequence', `/data/${spaceId}/${model.coll}`, {title: 'third doc', id: '5', sequence: 6})
  id = result.data.id
  result = await c.get('get third doc', `/data/${spaceId}/${model.coll}/${id}`)
  c.assertEqual(result.data.id, '5')
  c.assertEqual(result.data.sequence, 6)

  result = await c.post('create fourth doc with default/next id/sequence', `/data/${spaceId}/${model.coll}`, {title: 'fourth doc'})
  id = result.data.id
  result = await c.get('get fourth doc', `/data/${spaceId}/${model.coll}/${id}`)
  c.assertEqual(result.data.id, '6')
  c.assertEqual(result.data.sequence, 7)

  result = await c.post({it: 'attempt create with invalid id', status: 422}, `/data/${spaceId}/${model.coll}`, {title: 'invalid doc', id: 'foobar'})
  result = await c.post({it: 'attempt create with non-unique id', status: 422}, `/data/${spaceId}/${model.coll}`, {title: 'invalid doc', id: '6'})

  result = await c.post({it: 'attempt create with invalid sequence', status: 422}, `/data/${spaceId}/${model.coll}`, {title: 'invalid doc', sequence: 'foobar'})
  result = await c.post({it: 'attempt create with non-unique sequence', status: 422}, `/data/${spaceId}/${model.coll}`, {title: 'invalid doc', sequence: 7})
}
