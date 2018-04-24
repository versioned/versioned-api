const config = require('app/config')
const {mongo} = config.modules
const {wrapData, jsonResponse} = config.modules.response

async function dbStats (req, res) {
  const stats = await mongo.dbStats()
  jsonResponse(req, res, wrapData(stats))
}

module.exports = {
  dbStats
}
