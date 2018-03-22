const lookupRoute = require('app/router').lookupRoute

function attachRoute(routesByMethod) {
  return function(req, res, next) {
    const match = lookupRoute(routesByMethod, req)
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
