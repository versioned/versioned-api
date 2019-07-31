function attachRoute (lookupRoute, logger) {
  async function _attachRoute (req, res, next) {
    const match = await lookupRoute(req, res)
    if (match && match.route) {
      req.route = match.route
      if (match.params) {
        req.pathParams = match.params
        req.params = Object.assign((req.params || {}), match.params)
      } else {
        req.pathParams = {}
      }
      const handlerName = req.route.handler.endpointName || req.route.handler.name
      logger.debug(`request ${req.method} ${req.url} -> route.handler=${handlerName} requestId=${req.requestId}`)
      next()
    } else {
      logger.debug(`request ${req.method} ${req.url} -> 404 requestId=${req.requestId}`)
      next({
        status: 404,
        errors: [{type: 'missing', message: `Could not find find route at ${req.method} ${req.url}`}]
      })
    }
  }
  return _attachRoute
}

module.exports = {attachRoute}
