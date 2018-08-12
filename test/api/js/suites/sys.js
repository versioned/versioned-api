const config = require('app/config')

module.exports = async function (c) {
  await c.get('get db stats as anonymous', `/sys/${config.SYS_ROUTE_KEY}/dbStats`)
}
