function accessError (message) {
  return message && {status: 401, errors: [{type: 'access', message}]}
}

module.exports = {
  accessError
}
