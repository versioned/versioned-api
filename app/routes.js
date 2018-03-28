const home = require('app/controllers/home')
const auth = require('app/controllers/auth')
const logger = require('app/config').logger
const modelRoutes = require('lib/model_routes')
const groupByMethod = require('lib/router').groupByMethod
const path = require('path')

const MODELS_DIR = path.join(__dirname, '/models')

const routes = [
  {
    method: 'get',
    path: '/',
    handler: home.index
  },
  {
    method: 'post',
    path: '/v1/login',
    handler: auth.login
  }
].concat(modelRoutes(MODELS_DIR))

logger.debug('routes:', routes)

module.exports = groupByMethod(routes)
