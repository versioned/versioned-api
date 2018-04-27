module.exports = async function (c) {
  await c.get({it: 'get db stats as regular user', status: 401}, '/sys/db_stats')

  let result = await c.get('get db stats as super user', '/sys/db_stats', {headers: c.data.superHeaders})
  c.assert(result.data.users.count > 0)
}
