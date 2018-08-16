const querystring = require('querystring')

function urlWithQuery (url, query) {
  if (query) {
    const sep = (url.includes('?') ? '&' : '?')
    return url + sep + querystring.stringify(query)
  } else {
    return url
  }
}

function makeError (message, options = {}) {
  const error = new Error(message)
  if (options.status) error.status = options.status
  return error
}

module.exports = {
  urlWithQuery,
  makeError
}
