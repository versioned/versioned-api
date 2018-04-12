const swaggerUtil = require('lib/swagger_util')
const config = require('app/config')

async function swagger (options = {}) {
  const routesModule = require('app/routes')
  const routes = await routesModule.getRoutes(options)
  const swaggerOptions = {
    title: config.TITLE,
    description: config.DESCRIPTION,
    version: routesModule.VERSION,
    basePath: undefined
  }
  return swaggerUtil.swagger(routes, swaggerOptions)
}

module.exports = swagger
