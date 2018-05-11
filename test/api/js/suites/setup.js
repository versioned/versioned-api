const {merge} = require('lib/util')
const users = require('app/models/users')

module.exports = async function (c) {
  let {account, user, headers} = await c.registerUser()
  c.defaultOptions = {headers}

  let result = await c.get('get user', `/users/${user.id}`)
  user = result.data

  const superUser = merge(c.makeUser(), {
    name: 'Super User'
  })
  result = await c.post('create super user', '/users', superUser)
  superUser.id = result.data.id
  await users.update(superUser.id, {superUser: true}, {callbacks: false})
  const superHeaders = await c.login(superUser)

  result = await c.get('get default space', `/${account.id}/spaces/${account.spaces[0]}`)
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

  result = await c.post('create a second space', `/${account.id}/spaces`, {name: 'My Second CMS', accountId: account.id})
  let secondSpace = result.data

  c.data = {account, user, superUser, superHeaders, space, secondSpace, model}
}
