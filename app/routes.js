const home = require('app/controllers/home')

const routesList = [
  {
    method: 'get',
    path: '/',
    handler: home.index
  },
]

const groupByMethod = function(routes) {
  return routes.reduce(function(map, route) {
    const method = route.method.toLowerCase()
    map[method] = map[method] || []
    map[method].push(route)
    return map
  }, {})
}

const routesByMethod = groupByMethod(routesList)

module.exports = {
  routesByMethod
}
