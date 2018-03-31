const handler = function (config = {}) {
  // NOTE: this handler will not handle all errors that may occur. Errors
  // in async callbacks that are not caught will trigger the 'uncaughtException' event
  // on the Node process and the process will exit. On Heroku this will yield an HTTP status 503.
  function handleError (req, res, err, message) {
    const status = err.status || 500
    const errors = err.errors || [err.message]
    const fullMessage = `${message}: url=${req.url} params=${JSON.stringify(req.params)}`
    if (status === 500) {
      console.error(fullMessage, err)
      if (config.BUGSNAG_API_KEY) {
        const bugsnag = require('bugsnag')
        bugsnag.notify(err)
      }
    }
    res.writeHead(status, {'Content-Type': 'application/json'})
    res.end(JSON.stringify({status, errors}))
  }
  return {handleError}
}

module.exports = handler
