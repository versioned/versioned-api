const config = require('app/config')
const {mongo} = config.modules
const {wrapData, jsonResponse} = config.modules.response
const spaces = require('app/models/spaces')

async function dbStats (req, res) {
  const stats = await mongo.dbStats()
  jsonResponse(req, res, wrapData(stats))
}

async function routes (req, res) {
  const routesModule = require('app/routes')
  const space = req.params.spaceId && (await spaces.get(req.params.spaceId))
  const routes = await routesModule.getRoutes({space})
  jsonResponse(req, res, wrapData(routes))
}

module.exports = {
  dbStats,
  routes
}
