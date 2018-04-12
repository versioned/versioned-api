const {notNil} = require('lib/util')

const LOG_LEVELS = {
  error: 0,
  info: 1,
  debug: 2,
  verbose: 3
}

function logger (config) {
  function shouldLog (level) {
    const logLevel = LOG_LEVELS[level.toLowerCase()]
    const configLevel = LOG_LEVELS[config.LOG_LEVEL.toLowerCase()]
    return notNil(logLevel) && notNil(configLevel) && (configLevel >= logLevel)
  }

  function log (level, message, ...args) {
    if (shouldLog(level)) {
      console.log(`${level}: ${message}`, ...args)
    }
  }

  function error (message, ...args) {
    log('error', message, ...args)
  }

  function info (message, ...args) {
    log('info', message, ...args)
  }

  function debug (message, ...args) {
    log('debug', message, ...args)
  }

  function verbose (message, ...args) {
    log('verbose', message, ...args)
  }

  return {
    shouldLog,
    log,
    error,
    info,
    debug,
    verbose
  }
}

module.exports = logger
