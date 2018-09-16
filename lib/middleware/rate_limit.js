const {getIn} = require('lib/util')

let countsCreatedAt = null
let counts = null

function initCounts () {
  countsCreatedAt = new Date()
  counts = {}
}

initCounts()

function rateLimitExceeded (key, limit) {
  const secondElapsed = (new Date() - countsCreatedAt > 1000)
  if (secondElapsed) initCounts()
  counts[key] = (counts[key] || 0) + 1
  return counts[key] > limit
}

// Inspired by https://github.com/nfriedly/express-rate-limit
function rateLimit (config) {
  return function (req, res, next) {
    const key = getIn(req, 'user.id') || req.queryParams.apiKey || req.ip
    if (config.RATE_LIMIT && rateLimitExceeded(key, parseInt(config.RATE_LIMIT))) {
      res.writeHead(429)
      res.end()
    } else {
      next()
    }
  }
}

module.exports = {
  rateLimit
}
