const {wrapData, jsonResponse} = require('lib/response')
const mongo = require('lib/mongo')

async function dbStats (req, res) {
  const stats = await mongo.dbStats()
  jsonResponse(req, res, wrapData(stats))
}

module.exports = {
  dbStats
}
