module.exports = async function (c) {
  const {user, headers} = await c.registerUser()
  c.defaultOptions = {headers}
  c.data = {user}
}
