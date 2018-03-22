const app = require('app/app')
const routesByMethod = require('app/routes').routesByMethod
const serveStatic = require('lib/middleware/static').serveStatic
const setCorsHeaders = require('lib/middleware/cors').setCorsHeaders
const attachRoute = require('lib/middleware/route').attachRoute
const queryParser = require('lib/middleware/query').queryParser
const bodyParser = require('lib/middleware/body').bodyParser
const setCacheHeader = require('lib/middleware/cache').setCacheHeader
const config = require('app/config')

process.on('uncaughtException', (err) => {
  console.error('uncaugthException:', err)
})

if (config.BUGSNAG_API_KEY) {
  const bugsnag = require('bugsnag')
  bugsnag.register(config.BUGSNAG_API_KEY)
}

function start() {
  app.use(serveStatic('public'))
  app.use(setCorsHeaders)
  app.use(attachRoute(routesByMethod))
  app.use(queryParser)
  app.use(bodyParser)
  app.use(setCacheHeader)
  app.server.on('listening', () => {
    console.log(`Server listening on port ${config['PORT']} with config=${JSON.stringify(config, null, 4)}`)
  })
  app.listen(config['PORT'])
  return app.server
}

module.exports = {
  start
}
