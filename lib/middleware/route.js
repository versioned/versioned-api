const {lookupRoute, groupByMethod} = require('lib/router')

function parseSpaceId (req) {
  const SPACE_ID_PATTERN = /\/data\/([a-f0-9]{24})\//
  const match = req.url.match(SPACE_ID_PATTERN)
  return match && match[1]
}

function attachRoute (getRoutes, logger) {
  async function _attachRoute (req, res, next) {
    const spaceId = parseSpaceId(req)
    const routesByMethod = groupByMethod(await getRoutes({spaceId}))
    const match = await lookupRoute(routesByMethod, req)
    if (match.route) {
      req.route = match.route
      if (match.params) {
        req.pathParams = match.params
        req.params = Object.assign((req.params || {}), match.params)
      } else {
        req.pathParams = {}
      }
      logger.debug(`route ${req.method} ${req.url} -> route.handler=${req.route.handler.name}`)
      next()
    } else {
      logger.debug(`route ${req.method} ${req.url} -> 404`)
      next({
        status: 404,
        errors: [{type: 'missing', message: `Could not find find route at ${req.method} ${req.url}`}]
      })
    }
  }
  return _attachRoute
}

module.exports = {attachRoute}
