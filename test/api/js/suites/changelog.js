const {elapsedSeconds} = require('lib/date_util')

module.exports = async function (c) {
  const accountId = c.data.account.id
  const space = {
    name: c.uuid(),
    accountId
  }
  let result = await c.post('create another space', `/${accountId}/spaces`, space)
  const id = result.data.id
  c.assert(id)
  c.assertEqual(result.data.accountId, accountId)

  result = await c.get({it: 'list changelog without auth', status: 401}, `/${accountId}/changelog`, {headers: {authorization: null}})

  result = await c.get('list changelog', `/${accountId}/changelog`)
  let changelogId = result.data[0].id
  c.assertEqual(result.data[0].action, 'create')
  c.assertEqual(result.data[0].accountId, accountId)
  c.assert(!result.data[0].changes)
  c.assertEqual(result.data[0].doc.id, id)
  c.assertEqual(result.data[0].doc.name, space.name)

  result = await c.get({it: 'get changelog without auth', status: 401}, `/${accountId}/changelog/${changelogId}`, {headers: {authorization: null}})

  result = await c.get('get changelog', `/${accountId}/changelog/${changelogId}`)
  c.assertEqual(result.data.id, changelogId)
  c.assertEqual(result.data.action, 'create')
  c.assertEqual(result.data.doc.id, id)
  c.assertEqual(result.data.accountId, accountId)
  c.assertEqual(result.data.doc.name, space.name)
  c.assertEqual(result.data.doc.accountId, space.accountId)
  c.assert(elapsedSeconds(result.data.createdAt) < 1)
  c.assert(result.data.createdBy.id, c.data.user.id)

  result = await c.put({it: 'there is no changelog update', status: 404}, `/${accountId}/changelog/${changelogId}`, {})

  result = await c.put('update name', `/${accountId}/spaces/${id}`, {name: 'changed name'})

  result = await c.get('list changelog', `/${accountId}/changelog`)
  c.assertEqual(result.data[0].action, 'update')
  c.assertEqual(result.data[0].doc.id, id)
  c.assertEqual(result.data[0].doc.name, 'changed name')
  c.assertEqual(result.data[0].existingDoc.id, id)
  c.assertEqual(result.data[0].existingDoc.name, space.name)
  c.assert(elapsedSeconds(result.data[0].createdAt) < 1)
  c.assertEqual(result.data[0].createdBy.id, c.data.user.id)
  c.assertEqual(result.data[0].changes, {name: {changed: {from: space.name, to: 'changed name'}}})
  let countBefore = result.body.count

  result = await c.put('update name again (recent update)', `/${accountId}/spaces/${id}`, {name: 'changed name again'})

  result = await c.get('list changelog', `/${accountId}/changelog`)
  c.assertEqual(result.data[0].action, 'update')
  c.assertEqual(result.data[0].doc.id, id)
  c.assertEqual(result.data[0].doc.name, 'changed name again')
  c.assertEqual(result.data[0].existingDoc.id, id)
  c.assertEqual(result.data[0].existingDoc.name, space.name)
  c.assert(elapsedSeconds(result.data[0].createdAt) < 1)
  c.assertEqual(result.data[0].createdBy.id, c.data.user.id)
  c.assertEqual(result.data[0].changes, {name: {changed: {from: space.name, to: 'changed name again'}}})
  c.assertEqual(result.body.count, countBefore)

  result = await c.delete('delete space', `/${accountId}/spaces/${id}`)

  result = await c.get('list changelog', `/${accountId}/changelog`)
  c.assertEqual(result.data[0].action, 'delete')
  c.assertEqual(result.data[0].doc.id, id)
  c.assertEqual(result.data[0].doc.name, 'changed name again')
  c.assert(elapsedSeconds(result.data[0].createdAt) < 1)
  c.assertEqual(result.data[0].createdBy.id, c.data.user.id)
  c.assert(!result.data[0].changes)
}
