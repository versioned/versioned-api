const config = require('app/config')
const {logger, mongo, redis} = config.modules
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
const rateLimit = require('lib/middleware/rate_limit').rateLimit
const auth = require('lib/middleware/auth').auth
const users = require('app/models/users')

const AUTH_CONFIG = {
  JWT_SECRET: config.JWT_SECRET,
  findUser: users.get,
  checkAccess,
  logger
}

function setupMiddleware (app) {
  if (process.env.BUGSNAG_API_KEY) {
    const bugsnag = require('bugsnag')
    app.use(bugsnag.requestHandler)
  }
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
  app.use(rateLimit(config))
}

process.on('uncaughtException', (err) => {
  logger.error('uncaugthException:', err)
})

if (process.env.BUGSNAG_API_KEY) {
  const bugsnag = require('bugsnag')
  bugsnag.register(process.env.BUGSNAG_API_KEY)
}

function startApp (app) {
  return new Promise((resolve, reject) => {
    setupMiddleware(app)
    app.listen(config['PORT'])
    app.server.on('listening', () => resolve(app.server))
    app.server.on('error', reject)
  })
}

async function start () {
  logger.info(`Starting server with config=${JSON.stringify(config, null, 4)}`)
  try {
    await mongo.connect()
    await redis.connect()
    const server = await startApp(app)
    return server
  } catch (error) {
    logger.error(`Error thrown when starting server: ${error}`, error)
    throw error
  }
}

module.exports = {
  start
}
