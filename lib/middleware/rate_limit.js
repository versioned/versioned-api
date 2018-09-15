let countsCreatedAt = null
let counts = null

function initCounts () {
  countsCreatedAt = new Date()
  counts = {}
}

initCounts()

function rateLimitExceeded (ip, limit) {
  const secondElapsed = (new Date() - countsCreatedAt > 1000)
  if (secondElapsed) initCounts()
  counts[ip] = (counts[ip] || 0) + 1
  return counts[ip] > limit
}

// Inspired by https://github.com/nfriedly/express-rate-limit
function rateLimit (config) {
  return function (req, res, next) {
    if (config.RATE_LIMIT && rateLimitExceeded(req.ip, parseInt(config.RATE_LIMIT))) {
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
