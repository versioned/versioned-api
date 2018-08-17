const {pick, merge} = require('lib/util')

const NODE_ENV = process.env.NODE_ENV || 'development'
const defaultConfig = {
  TITLE: 'Versioned API',
  DESCRIPTION: 'Supports custom content types and versioning',
  NODE_ENV,
  PORT: 3000,
  LOG_LEVEL: 'debug',
  CACHE_EXPIRY: '0',
  MONGODB_URL: `mongodb://localhost:27017/versioned2_${NODE_ENV}`,
  JWT_SECRET: '393dabff04884cf89ce918f53924d63e',
  JWT_EXPIRY: (3600 * 24 * 30),
  MODELS_LIMIT: 30,
  PROPERTY_LIMIT: 20,
  ALGOLIASEARCH_APPLICATION_ID: null,
  ALGOLIASEARCH_API_KEY: null,
  ALGOLIASEARCH_API_KEY_SEARCH: null,
  SENDGRID_API_KEY: null,
  API_BASE_URL: (NODE_ENV === 'development' ? 'http://localhost:3000/v1' : 'https://api.versioned.io/v1'),
  UI_BASE_URL: (NODE_ENV === 'development' ? 'http://localhost:8080' : 'https://app.versioned.io'),
  EMAIL_PREFIX: 'Versioned',
  EMAIL_ENABLED: (NODE_ENV === 'production'),
  FROM_EMAIL: 'noreply@versioned.io',
  CONTACT_EMAIL: 'info@versioned.io',
  SYS_ROUTE_KEY: '22b46b0da4'
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
