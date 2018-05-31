function uuid (length = 6) {
  const time = (new Date()).valueOf().toString()
  const random = Math.random().toString()
  return require('crypto').createHash('sha1').update(time + random).digest('hex').substring(0, length)
}

module.exports = {
  uuid
}
