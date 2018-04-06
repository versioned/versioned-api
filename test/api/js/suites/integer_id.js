module.exports = async function (c) {
  const {_user, headers} = await c.registerUser()

  let startIndex = null
  let maxId = 0
  for (let i = 0; i < 3; ++i) {
    let result = await c.post(`create user ${i}`, `/users`, c.makeUser())
    if (startIndex == null) startIndex = result.data.id
    c.assertEqual(result.data.id, startIndex + i)
    if (result.data.id > maxId) maxId = result.data.id
  }

  await c.delete('delete last created user', `/users/${maxId}`, {headers})

  let result = await c.post(`create another user`, `/users`, c.makeUser())
  c.assertEqual(result.data.id, maxId + 1)
  let lastUser = result.data

  result = await c.get(`get user by id`, `/users/${lastUser.id}`, {headers})
  c.assertEqual(result.data.id, lastUser.id)
  c.assertEqual(result.data.email, lastUser.email)

  result = await c.get(`get user by _id`, `/users/${lastUser._id}`, {headers})
  c.assertEqual(result.data.id, lastUser.id)
  c.assertEqual(result.data.email, lastUser.email)
}
