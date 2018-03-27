const config = require('app/config')
const mongo = require('lib/mongo')
const logger = config.logger
const routesByMethod = require('app/routes')
const app = require('lib/app')(routesByMethod, config)
const serveStatic = require('lib/middleware/static').serveStatic
const setCorsHeaders = require('lib/middleware/cors').setCorsHeaders
const attachRoute = require('lib/middleware/route').attachRoute
const queryParser = require('lib/middleware/query').queryParser
const bodyParser = require('lib/middleware/body').bodyParser
const setCacheHeader = require('lib/middleware/cache').setCacheHeader

function setupMiddleware (app) {
  app.use(serveStatic('public'))
  app.use(setCorsHeaders)
  app.use(attachRoute(routesByMethod))
  app.use(queryParser)
  app.use(bodyParser)
  app.use(setCacheHeader)
}

process.on('uncaughtException', (err) => {
  logger.error('uncaugthException:', err)
})

if (config.BUGSNAG_API_KEY) {
  const bugsnag = require('bugsnag')
  bugsnag.register(config.BUGSNAG_API_KEY)
}

function start () {
  return new Promise((resolve, reject) => {
    logger.info(`Starting server with config=${JSON.stringify(config, null, 4)}`)
    mongo.connect(config.MONGODB_URL)
      .then(() => {
        setupMiddleware(app)
        app.listen(config['PORT'])
        app.server.on('listening', () => resolve(app.server))
        app.server.on('error', reject)
      })
      .catch(dbError => {
        logger.error(`Could not connect to database: ${dbError}`)
        reject(dbError)
      })
  })
}

module.exports = {
  start
}
