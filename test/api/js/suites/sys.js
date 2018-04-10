module.exports = async function (c) {
  let result = await c.get('get db stats', '/sys/db_stats')
  console.log(result)
}
