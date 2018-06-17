const {pick, merge} = require('lib/util')

const NODE_ENV = process.env.NODE_ENV || 'development'
const defaultConfig = {
  TITLE: 'CMS Rest API',
  DESCRIPTION: 'Supports custom content types and versioning',
  NODE_ENV,
  PORT: 3000,
  LOG_LEVEL: 'debug',
  CACHE_EXPIRY: '0',
  MONGODB_URL: `mongodb://localhost:27017/versioned2_${NODE_ENV}`,
  JWT_SECRET: '393dabff04884cf89ce918f53924d63e',
  JWT_EXPIRY: (3600 * 24 * 30),
  PROPERTY_LIMIT: 50,
  MODELS_LIMIT: 100,
  DATA_LIMIT: 5000,
  ALGOLIASEARCH_APPLICATION_ID: null,
  ALGOLIASEARCH_API_KEY: null,
  ALGOLIASEARCH_INDEX_NAME: `versioned2-${NODE_ENV}`
}
const envConfig = pick(process.env, Object.keys(defaultConfig))
const config = merge(defaultConfig, envConfig)

const logger = require('lib/logger')(config)

module.exports = Object.assign({}, config, {
  modules: {
    logger,
    response: require('lib/response')(logger, config),
    mongo: require('lib/mongo')(config.MONGODB_URL)
  }
})
