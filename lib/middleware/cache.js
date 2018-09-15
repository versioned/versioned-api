function setCacheHeader (config) {
  return function (req, res, next) {
    // Set cache header for the CDN (i.e. Fastly/Cloudfront)
    const maxAge = req.queryParams.apiKey ? config.CACHE_EXPIRY : '0'
    res.setHeader('Cache-Control', `public, max-age=${maxAge}`)
    next()
  }
}

module.exports = {
  setCacheHeader
}
