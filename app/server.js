const config = require('app/config')
const {logger, mongo} = config.modules
const {lookupRoute, checkAccess} = require('app/routes')
const app = require('lib/app')(config)
const requestId = require('lib/middleware/request_id').requestId
const responseTime = require('lib/middleware/response_time').responseTime
const serveStatic = require('lib/middleware/static').serveStatic
const setCorsHeaders = require('lib/middleware/cors').setCorsHeaders
const attachRoute = require('lib/middleware/route').attachRoute
const queryParser = require('lib/middleware/query').queryParser
const bodyParser = require('lib/middleware/body').bodyParser
const validateParams = require('lib/middleware/validate_params').validateParams
const setCacheHeader = require('lib/middleware/cache').setCacheHeader
const auth = require('lib/middleware/auth').auth
const users = require('app/models/users')
const search = require('lib/search')

const AUTH_CONFIG = {
  JWT_SECRET: config.JWT_SECRET,
  findUser: users.get,
  checkAccess,
  logger
}

function setupMiddleware (app) {
  app.use(responseTime)
  app.use(serveStatic('public'))
  app.use(requestId)
  app.use(setCorsHeaders)
  app.use(queryParser)
  app.use(bodyParser)
  app.use(attachRoute(lookupRoute, logger))
  app.use(validateParams)
  app.use(setCacheHeader(config))
  app.use(auth(AUTH_CONFIG))
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
    mongo.connect()
      .then(() => {
        return search(config).setup()
      })
      .then(() => {
        setupMiddleware(app)
        app.listen(config['PORT'])
        app.server.on('listening', () => resolve(app.server))
        app.server.on('error', reject)
      })
      .catch(error => {
        logger.error(`Error thrown when starting server: ${error}`, error)
        reject(error)
      })
  })
}

module.exports = {
  start
}
