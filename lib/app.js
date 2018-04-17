const http = require('http')
const router = require('lib/router').router

function createApp (config) {
  const handleError = config.modules.response.errorResponse

  function runAllMiddleware (req, res, middlewares, callback) {
    let index = 0
    function next (err = null) {
      if (err) return callback(err, index - 1, false)
      const middleware = middlewares[index++]
      if (middleware) {
        try {
          middleware(req, res, next)
        } catch (e) {
          callback(e, index - 1, true)
        }
      } else {
        callback()
      }
    }
    next()
  }

  const app = {
    middlewares: [],

    router: router({handleError}),

    use (middleware) {
      this.middlewares.push(middleware)
    },

    handler (req, res) {
      req.on('error', err => {
        console.error('req.on(\'error\'): ', err)
      })
      res.on('error', err => {
        console.error('res.on(\'error\'): ', err)
      })
      runAllMiddleware(req, res, this.middlewares, (err, middlewareIndex, errorThrown) => {
        if (err) {
          handleError(req, res, err, `Error in middleware middlewareIndex=${middlewareIndex} middleware=${this.middlewares[middlewareIndex].name} errorThrown=${errorThrown}`)
        } else {
          this.router(req, res)
        }
      })
    },

    server: http.createServer(),

    listen (port) {
      this.server.on('listening', () => console.log(`Server listening on port ${port}`))
      this.server.on('request', this.handler.bind(this))
      this.server.listen(port)
    }
  }
  app.server.on('error', error => {
    console.error('server error', error)
  })
  return app
}

module.exports = createApp
