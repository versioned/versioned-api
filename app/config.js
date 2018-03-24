const u = require('lib/util')
const createLogger = require('lib/logger')

const defaultConfig = {
  PORT: 3000,
  LOG_LEVEL: 'debug',
  CACHE_EXPIRY: '5',
  MONGODB_URL: 'mongodb://localhost:27017/versioned2',
  JWT_SECRET: '393dabff04884cf89ce918f53924d63e'
}
const envConfig = u.pick(Object.keys(defaultConfig), process.env)
const config = u.merge(defaultConfig, envConfig)

module.exports = Object.assign({}, config, {
  logger: createLogger(config)
})
