const querystring = require('querystring')

function urlWithQuery (url, query) {
  if (query) {
    const sep = (url.includes('?') ? '&' : '?')
    return url + sep + querystring.stringify(query)
  } else {
    return url
  }
}

module.exports = {
  urlWithQuery
}
