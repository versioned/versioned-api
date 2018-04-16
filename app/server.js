const config = require('app/config')
const mongo = require('lib/mongo')
const logger = config.logger
const {getRoutes} = require('app/routes')
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

const AUTH_CONFIG = {
  JWT_SECRET: config.JWT_SECRET,
  findUser: users.get,
  logger
}

function setupMiddleware (app) {
  app.use(responseTime)
  app.use(serveStatic('public'))
  app.use(requestId)
  app.use(setCorsHeaders)
  app.use(attachRoute(getRoutes, config.logger))
  app.use(queryParser)
  app.use(bodyParser)
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
