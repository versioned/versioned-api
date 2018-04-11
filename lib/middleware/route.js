const {lookupRoute, groupByMethod} = require('lib/router')
const logger = require('app/config').logger

function attachRoute (getRoutes) {
  return async function (req, res, next) {
    const routesByMethod = groupByMethod(await getRoutes())
    const match = await lookupRoute(routesByMethod, req)
    if (match.route) {
      req.route = match.route
      if (match.params) {
        req.pathParams = match.params
        req.params = Object.assign((req.params || {}), match.params)
      }
      logger.debug(`route ${req.method} ${req.url} -> handler=${req.route.handler.name}`)
      next()
    } else {
      next({
        status: 404,
        errors: [{type: 'missing', message: `Could not find find route at ${req.method} ${req.url}`}]
      })
    }
  }
}

module.exports = {attachRoute}
