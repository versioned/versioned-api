const https = require('https')
const http = require('http')
const querystring = require('querystring')
const u = require('lib/util')

function httpModule (url) {
  return url.startsWith('https') ? https : http
}

function urlWithQuery (url, query) {
  if (query) {
    const sep = (url.includes('?') ? '&' : '?')
    return url + sep + querystring.stringify(query)
  } else {
    return url
  }
}

function isSuccess (status) {
  return status && Math.floor(status / 100) === 2
}

function isServerError (status) {
  return status && Math.floor(status / 100) === 5
}

const DEFAULT_CONFIG = {
  HTTP_RETRIES: 3,
  logger: {
    debug: (message) => console.log(message),
    verbose: function () {},
    shouldLog: (level) => level !== 'verbose'
  }
}

function client (config = {}) {
  config = Object.assign({}, DEFAULT_CONFIG, config)
  const {logger} = config
  function get (url, options = {}) {
    url = urlWithQuery(url, options.query)
    const beforeTime = Date.now()
    return new Promise(function (resolve, reject) {
      httpModule(url).get(url, (res) => {
        let body = ''
        res.on('data', chunk => {
          body += chunk
        })
        res.on('end', () => {
          const responseTime = Date.now() - beforeTime
          logger.debug(`http_client.get url=${url} status=${res.statusCode} response_time=${responseTime} body.length=${body.length}`)
          if (logger.shouldLog('verbose')) logger.verbose(`http_client.get body=${body}`)
          resolve({success: isSuccess(res.statusCode), status: res.statusCode, headers: res.headers, body})
        })
      }).on('error', error => {
        logger.debug(`http_client.get url=${url} error=${error.message}`)
        reject(error)
      })
    })
  }

  function getWithRetry (url, options = {}) {
    options.attempt = options.attempt || 1
    return get(url, options)
      .catch((result) => {
        if (u.nil(result.status) || isServerError(result.status)) {
          const retry = (options.attempt && options.attempt < parseInt(config.HTTP_RETRIES))
          console.error(`Error in http_client.get: url=${url} attempt=${options.attempt} retry=${retry} options=${JSON.stringify(options)}`, result)
          if (retry) {
            return getWithRetry(url, u.merge(options, {attempt: (options.attempt + 1)}))
          } else {
            return Promise.reject(result)
          }
        } else {
          return Promise.reject(result)
        }
      })
  }

  return {
    get: getWithRetry
  }
}

module.exports = client
