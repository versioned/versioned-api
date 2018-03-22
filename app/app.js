const http = require('http')
const routesByMethod = require('app/routes').routesByMethod
const router = require('lib/router').router
const config = require('app/config')
const handleError = require('lib/error_handler')(config).handleError

function runAllMiddleware(req, res, middlewares, callback) {
  let index = 0
  function next(err = null) {
    if (err) return callback(err)
    const middleware = middlewares[index++]
    if (middleware) {
      try {
        middleware(req, res, next)
      } catch (e) {
        callback(e)
      }
    } else {
      callback()
    }
  }
  next()
}

const app = {
  middlewares: [],

  router: router(routesByMethod, {handleError}),

  use(middleware) {
    this.middlewares.push(middleware)
  },

  handler(req, res) {
    req.on('error', function(err) {
      console.error('req.on(\'error\'): ', err)
    })
    res.on('error', function(err) {
      console.error('res.on(\'error\'): ', err)
    })
    runAllMiddleware(req, res, this.middlewares, (err) => {
      if (err) {
        handleError(req, res, err, 'Error in middleware')
      } else {
        this.router(req, res)
      }
    })
  },

  server: http.createServer(),

  listen(port) {
    this.server.on('request', this.handler.bind(this))
    this.server.listen(port)
  }
}

module.exports = app
