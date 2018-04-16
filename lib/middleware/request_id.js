const {uuid} = require('lib/util')

function requestId (req, res, next) {
  req.requestId = uuid(10)
  next()
}

module.exports = {
  requestId
}
