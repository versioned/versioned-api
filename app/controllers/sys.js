const config = require('app/config')
const {wrapData, jsonResponse} = config.modules.response
const mongo = require('lib/mongo')

async function dbStats (req, res) {
  const stats = await mongo.dbStats()
  jsonResponse(req, res, wrapData(stats))
}

module.exports = {
  dbStats
}
