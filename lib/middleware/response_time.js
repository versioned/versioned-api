// See: https://github.com/expressjs/response-time/blob/master/index.js
const responseTime = function (req, res, next) {
  req.startTime = new Date()
  req.responseTime = () => new Date() - req.startTime
  next()
}

module.exports = {
  responseTime
}
