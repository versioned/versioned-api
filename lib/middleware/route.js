const {lookupRoute, groupByMethod} = require('lib/router')

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
    }
    next()
  }
}

module.exports = {attachRoute}
