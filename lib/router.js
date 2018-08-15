const u = require('lib/util')
const parseUrl = require('url').parse

const PARAM_NAME_PATTERN = /:[a-z0-9_]+/ig
const PARAM_VALUE_PATTERN = '([^/]+)'

function removeTrailingSlash (path) {
  return path === '/' ? path : path.replace(/\/$/, '')
}

const parsePath = function (path) {
  const paramNames = []
  const patternString = path.replace(PARAM_NAME_PATTERN, function (match) {
    paramNames.push(match.substring(1))
    return PARAM_VALUE_PATTERN
  })
  if (paramNames.length > 0) {
    return {
      pattern: new RegExp('^' + patternString + '$'),
      paramNames
    }
  } else {
    return null
  }
}

const matchRoute = function (requestPath, route) {
  const path = parsePath(route.path)
  if (path && path.pattern) {
    const match = requestPath.match(path.pattern)
    if (match) {
      const paramValues = match.slice(1, path.paramNames.length + 1).map(decodeURIComponent)
      return {matches: true, params: u.zipObj(path.paramNames, paramValues)}
    } else {
      return {matches: false}
    }
  } else {
    const matches = (route.path === requestPath)
    return {matches}
  }
}

function lookupRoute (routesByMethod, req) {
  const requestPath = removeTrailingSlash(parseUrl(req.url).pathname)
  let params = null
  const method = req.method.toLowerCase()
  const route = (routesByMethod[method] || []).find(function (r) {
    const match = matchRoute(requestPath, r)
    if (match.params) params = match.params
    return match.matches
  })
  return {route, params}
}

const groupByMethod = function (routes) {
  return routes.reduce(function (map, route) {
    const method = route.method.toLowerCase()
    map[method] = map[method] || []
    map[method].push(route)
    return map
  }, {})
}

const router = function (options = {}) {
  return async function (req, res) {
    if (req.route) {
      try {
        await req.route.handler(req, res)
      } catch (err) {
        console.log('router: error in handler', err)
        if (options.handleError) options.handleError(req, res, err, 'Error in handler')
      }
    } else {
      res.writeHead(404)
      res.end()
    }
  }
}

module.exports = {
  groupByMethod,
  lookupRoute,
  router
}
