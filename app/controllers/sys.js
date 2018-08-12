const config = require('app/config')
const {mongo} = config.modules
const {pick} = require('lib/util')
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

async function errorTest (req, res) {
  throw new Error('Testing if we get a notification if an error is thrown in a handler')
}

async function info (req, res) {
  const vars = ['HEROKU_RELEASE_CREATED_AT', 'HEROKU_SLUG_COMMIT', 'HEROKU_APP_NAME', 'HEROKU_DYNO_ID', 'HEROKU_RELEASE_VERSION', 'HEROKU_SLUG_DESCRIPTION']
  const data = pick(process.env, vars)
  jsonResponse(req, res, wrapData(data))
}

async function ping (req, res) {
  // NOTE: making sure we can connect to the database
  const numberOfSpaces = await spaces.count()
  jsonResponse(req, res, wrapData({numberOfSpaces}))
}

module.exports = {
  dbStats,
  routes,
  errorTest,
  info,
  ping
}
