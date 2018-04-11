const swaggerUtil = require('lib/swagger_util')
const config = require('app/config')

async function swagger () {
  const routesModule = require('app/routes')
  const routes = await routesModule.getRoutes()
  const options = {
    title: config.TITLE,
    description: config.DESCRIPTION,
    version: routesModule.VERSION,
    basePath: undefined
  }
  return swaggerUtil.swagger(routes, options)
}

module.exports = swagger
