const u = require('app/util')
const parseUrl = require('url').parse
const parseQuery = require('querystring').parse

// NOTE: Node query parser supports arrays but not foo[bar] nesting,
// see https://github.com/ljharb/qs
const queryParser = function(req, res, next) {
  req.params = req.params || {}
  const queryString = parseUrl(req.url).query
  const query = queryString ? parseQuery(queryString) : {}
  if (u.notEmpty(query)) {
    req.queryParams = query
    req.params = Object.assign((req.params || {}), query)
  }
  next()
}

module.exports = {queryParser}
