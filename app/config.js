const u = require('app/util')

const defaultConfig = {
  PORT: 3000,
  LOG_LEVEL: 'debug',
  CACHE_EXPIRY: '5',
}
const envConfig = u.pick(Object.keys(defaultConfig), process.env)
const config = u.merge(defaultConfig, envConfig)

module.exports = config
