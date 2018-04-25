module.exports = async function (c) {
  const {account, user, headers} = await c.registerUser()
  c.defaultOptions = {headers}

  let result = await c.post('create space', '/spaces', {name: 'My CMS', accountId: account.id})
  const space = result.data

  result = await c.post('create model', '/models', {
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

  c.data = {account, user, space, model}
}
