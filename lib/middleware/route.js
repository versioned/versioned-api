function attachRoute (lookupRoute, logger) {
  async function _attachRoute (req, res, next) {
    const match = await lookupRoute(req, res)
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
