module.exports = async function (c) {
  let result = await c.get('get db stats', '/sys/db_stats')
  c.assert(result.data.users.count > 0)
}
