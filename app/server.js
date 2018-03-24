const config = require('app/config')
const logger = config.logger
const routesByMethod = require('app/routes')
const app = require('lib/app')(routesByMethod, config)
const serveStatic = require('lib/middleware/static').serveStatic
const setCorsHeaders = require('lib/middleware/cors').setCorsHeaders
const attachRoute = require('lib/middleware/route').attachRoute
const queryParser = require('lib/middleware/query').queryParser
const bodyParser = require('lib/middleware/body').bodyParser
const setCacheHeader = require('lib/middleware/cache').setCacheHeader

process.on('uncaughtException', (err) => {
  logger.error('uncaugthException:', err)
})

if (config.BUGSNAG_API_KEY) {
  const bugsnag = require('bugsnag')
  bugsnag.register(config.BUGSNAG_API_KEY)
}

async function start() {
  await mongo.connect(config.MONGODB_URL)
  app.use(serveStatic('public'))
  app.use(setCorsHeaders)
  app.use(attachRoute(routesByMethod))
  app.use(queryParser)
  app.use(bodyParser)
  app.use(setCacheHeader)
  app.server.on('listening', () => {
    logger.info(`Server listening on port ${config['PORT']} with config=${JSON.stringify(config, null, 4)}`)
  })
  app.listen(config['PORT'])
  return app.server
}

module.exports = {
  start
}
