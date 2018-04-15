const {pick, getIn, compact, groupBy, mapObj} = require('lib/util')
const {withoutRefs} = require('lib/json_schema')

const RESPONSES = {
  '200': {
    description: 'Success'
  },
  '422': {
    description: 'Validation error'
  },
  '401': {
    description: 'Unauthorized'
  },
  '404': {
    description: 'Not found'
  }
}

const AUTH_PARAM = {
  name: 'Authorization',
  description: 'User auth header with JWT token on the format "Bearer {token}"',
  in: 'header',
  required: true,
  schema: {type: 'string'}
}

function parameters (route) {
  let result = route.parameters || []
  if (route.require_auth !== false) result = result.concat(AUTH_PARAM)
  return result
}

// TODO: Need to know if auth is required for route
function path (route) {
  const model = getIn(route, ['model', 'coll'])
  const tags = route.tags || [model]
  const summary = route.summary
  const responses = RESPONSES
  return compact({
    tags,
    summary,
    'x-model': model,
    'x-handler': route.handler.name,
    parameters: parameters(route),
    responses
  })
}

// Handles path param conversion from :param_name to {param_name}
// Also - removes the basePath
function swaggerPath (routePath, options = {}) {
  const path = routePath.replace(/:[a-zA-Z_]+/g, m => '{' + m.substring(1) + '}')
  if (options.basePath && path.startsWith(options.basePath)) {
    return path.slice(options.basePath.length) || '/'
  } else {
    return path
  }
}

// Groups routes by path, then method, and converts route objects to swagger path objects
function paths (routes, options = {}) {
  return mapObj(groupBy(routes, r => swaggerPath(r.path, options)), (_path, routes) => {
    return routes.reduce((acc, route) => {
      acc[route.method] = path(route)
      return acc
    }, {})
  })
}

function swagger (routes, options = {}) {
  return withoutRefs({
    openapi: '3.0.0',
    servers: [],
    info: pick(options, ['title', 'description', 'version']),
    paths: paths(routes, options)
  })
}

module.exports = {
  swagger
}
