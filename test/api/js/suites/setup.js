module.exports = async function (c) {
  const {user, headers} = await c.registerUser()
  c.defaultOptions = {headers}

  let result = await c.post('create space', '/spaces', {name: 'My CMS'})
  const space = result.data

  result = await c.post('create model', '/models', {
    title: 'Posts',
    space_id: space.id,
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

  c.data = {user, space, model}
}
