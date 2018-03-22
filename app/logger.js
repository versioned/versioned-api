const config = require('app/config')

const LOG_LEVELS = {
  info: 1,
  debug: 2,
  verbose: 3
}

function shouldLog(level) {
  const logLevel = LOG_LEVELS[level.toLowerCase()]
  const configLevel = LOG_LEVELS[config.LOG_LEVEL.toLowerCase()]
  return logLevel && configLevel && (configLevel >= logLevel)
}

function log(level, message) {
  if (shouldLog(level)) {
    console.log(message)
  }
}

function info(message) {
  log('info', message)
}

function debug(message) {
  log('debug', message)
}

function verbose(message) {
  log('verbose', message)
}

module.exports = {
  shouldLog,
  log,
  info,
  debug,
  verbose
}
