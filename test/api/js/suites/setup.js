module.exports = async function (c) {
  const {user, headers} = await c.registerUser()
  c.defaultOptions = {headers}

  let result = await c.post('create space', '/spaces', {name: 'My CMS'})
  const space = result.data

  c.data = {user, space}
}
