const {getIn, json, merge} = require('lib/util')
const jwt = require('lib/jwt')

const DEFAULT_OPTIONS = {
  authRequired: function (req) {
    return getIn(req, ['route', 'requireAuth']) !== false &&
           !(req.url === '/' || req.url === '') &&
           !req.url.endsWith('swagger.json') &&
           !req.url.includes('login') &&
           !(req.method === 'POST' && req.url.endsWith('users')) &&
           !(req.method === 'GET' && req.space && req.queryParams.published && req.queryParams.apiKey === req.space.apiKey)
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

function getPayload (token, options) {
  try {
    return token && jwt.decode(token, options.JWT_SECRET)
  } catch (error) {
    if (options.logger) options.logger.error(`Error in auth.getPayload ${error.message}`, error)
    return undefined
  }
}

function auth (options = {}) {
  options = merge(DEFAULT_OPTIONS, options)

  async function _auth (req, res, next) {
    const token = requestToken(req)
    const payload = getPayload(token, options)
    const user = payload && !tokenExpired(payload) && (await options.findUser(payload.userId))
    if (user) {
      req.user = user
      const accessError = options.checkAccess && options.checkAccess(req)
      if (accessError) {
        if (options.logger) options.logger.debug(`auth middleware accessError=${json(accessError)} user=${json(user)}`)
        next(accessError)
      } else {
        if (options.logger) options.logger.debug(`auth middleware authorized payload=${json(payload)}`)
        next()
      }
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
  return _auth
}

module.exports = {auth}
