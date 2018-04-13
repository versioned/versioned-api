const {uuid} = require('lib/util')

const requestId = function (req, res, next) {
  req.requestId = uuid(10)
  next()
}

module.exports = {
  requestId
}
