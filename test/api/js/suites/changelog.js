const {elapsedSeconds} = require('lib/date_util')

module.exports = async function (c) {
  const accountId = c.data.account.id
  const space = c.data.space

  let result = await c.post('create model', `/${space.id}/models`, {
    name: 'Changelog Posts',
    coll: 'changelog_posts',
    model: {
      schema: {
        type: 'object',
        properties: {
          title: {type: 'string'}
        },
        additionalProperties: false
      }
    }
  })
  const model = result.data

  result = await c.get({it: 'list changelog without auth', status: 401}, `/${space.id}/changelog`, {headers: {authorization: null}})

  result = await c.get('list changelog', `/${space.id}/changelog`)
  let changelogId = result.data[0].id
  c.assertEqual(result.data[0].action, 'create')
  c.assertEqual(result.data[0].accountId, accountId)
  c.assertEqual(result.data[0].spaceId, space.id)
  c.assert(!result.data[0].changes)
  c.assertEqual(result.data[0].doc.name, 'Changelog Posts')

  result = await c.get({it: 'get changelog without auth', status: 401}, `/${space.id}/changelog/${changelogId}`, {headers: {authorization: null}})

  result = await c.get('get changelog', `/${space.id}/changelog/${changelogId}`)
  c.assertEqual(result.data.id, changelogId)
  c.assertEqual(result.data.action, 'create')
  c.assertEqual(result.data.doc.id, model.id)
  c.assertEqual(result.data.accountId, accountId)
  c.assertEqual(result.data.doc.coll, model.coll)
  c.assertEqual(result.data.doc.accountId, space.accountId)
  c.assert(elapsedSeconds(result.data.createdAt) < 2)
  c.assert(result.data.createdBy.id, c.data.user.id)

  result = await c.put({it: 'there is no changelog update', status: 404}, `/${space.id}/changelog/${changelogId}`, {})

  result = await c.put('update name', `/${space.id}/models/${model.id}`, {name: 'changed name'})

  result = await c.get('list changelog', `/${space.id}/changelog`)
  c.assertEqual(result.data[0].action, 'update')
  c.assertEqual(result.data[0].doc.id, model.id)
  c.assertEqual(result.data[0].doc.name, 'changed name')
  c.assertEqual(result.data[0].existingDoc.id, model.id)
  c.assertEqual(result.data[0].existingDoc.name, model.name)
  c.assert(elapsedSeconds(result.data[0].createdAt) < 2)
  c.assertEqual(result.data[0].createdBy.id, c.data.user.id)
  c.assertEqual(result.data[0].changes, {name: {changed: {from: model.name, to: 'changed name'}}})
  let countBefore = result.body.count

  result = await c.put('update name again (recent update)', `/${space.id}/models/${model.id}`, {name: 'changed name again'})

  result = await c.get('list changelog', `/${space.id}/changelog`)
  c.assertEqual(result.data[0].action, 'update')
  c.assertEqual(result.data[0].doc.id, model.id)
  c.assertEqual(result.data[0].doc.name, 'changed name again')
  c.assertEqual(result.data[0].existingDoc.id, model.id)
  c.assertEqual(result.data[0].existingDoc.name, model.name)
  c.assert(elapsedSeconds(result.data[0].createdAt) < 2)
  c.assertEqual(result.data[0].createdBy.id, c.data.user.id)
  c.assertEqual(result.data[0].changes, {name: {changed: {from: model.name, to: 'changed name again'}}})
  c.assertEqual(result.body.count, countBefore)

  result = await c.delete('delete model', `/${space.id}/models/${model.id}`)

  result = await c.get('list changelog', `/${space.id}/changelog`)
  c.assertEqual(result.data[0].action, 'delete')
  c.assertEqual(result.data[0].doc.id, model.id)
  c.assertEqual(result.data[0].doc.name, 'changed name again')
  c.assert(elapsedSeconds(result.data[0].createdAt) < 2)
  c.assertEqual(result.data[0].createdBy.id, c.data.user.id)
  c.assert(!result.data[0].changes)
}
