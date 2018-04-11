const {getIn, json, merge} = require('lib/util')
const jwt = require('lib/jwt')

const DEFAULT_OPTIONS = {
  authRequired: function (req) {
    return getIn(req, ['route', 'require_auth']) !== false &&
           !(req.url === '/' || req.url === '') &&
           !req.url.endsWith('swagger.json') &&
           !req.url.includes('login') &&
           !(req.method === 'POST' && req.url.endsWith('users'))
  }
}

function requestToken (req) {
  const header = req.headers['authorization']
  const match = header && header.match(/^Bearer (.+)$/)
  return match && match[1]
}

function tokenExpired (payload) {
  return payload && payload.exp && Date.now() > payload.exp * 1000
}

function auth (options = {}) {
  options = merge(DEFAULT_OPTIONS, options)

  return async function (req, res, next) {
    const token = requestToken(req)
    const payload = token && jwt.decode(token, options.JWT_SECRET)
    const user = payload && !tokenExpired(payload) && (await options.findUser(payload.user_id))
    if (user) {
      req.user = user
      next()
    } else if (options.authRequired(req)) {
      if (options.logger) {
        options.logger.debug(`auth middleware unauthorized token=${token} payload=${json(payload)} tokenExpired=${tokenExpired(payload)} user=${json(user)}`)
      }
      const status = 401
      const error = {status, errors: [{type: 'auth', message: 'Must be authenticated'}]}
      next(error)
    } else {
      next()
    }
  }
}

module.exports = {auth}
