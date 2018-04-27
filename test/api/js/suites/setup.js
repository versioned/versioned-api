const {merge} = require('lib/util')
const users = require('app/models/users')

module.exports = async function (c) {
  const {account, user, headers} = await c.registerUser()
  c.defaultOptions = {headers}

  const superUser = merge(c.makeUser(), {
    name: 'Super User'
  })
  let result = await c.post('create super user', '/users', superUser)
  superUser.id = result.data.id
  await users.update(superUser.id, {superUser: true})
  const superHeaders = await c.login(superUser)

  result = await c.post('create space', `/${account.id}/spaces`, {name: 'My CMS', accountId: account.id})
  const space = result.data

  result = await c.post('create model', `/${account.id}/models`, {
    name: 'Posts',
    spaceId: space.id,
    coll: 'posts',
    model: {
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
  })
  const model = result.data

  c.data = {account, user, superUser, superHeaders, space, model}
}
