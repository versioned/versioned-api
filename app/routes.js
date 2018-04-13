const home = require('app/controllers/home')
const swagger = require('app/controllers/swagger')
const auth = require('app/controllers/auth')
const sys = require('app/controllers/sys')
const {concat} = require('lib/util')
const config = require('app/config')
const modelRoutes = require('lib/model_routes')(config.modules.response)
const dataRoutes = require('app/data_routes')
const path = require('path')

const VERSION = 'v1'
const PREFIX = `/${VERSION}`
const DATA_PREFIX = `${VERSION}/data`
const MODELS_DIR = path.join(__dirname, '/models')

const systemRoutes = [
  {
    tags: ['documentation'],
    summary: 'Home - redirects to documentation page (HTML)',
    method: 'get',
    path: '/',
    handler: home.index,
    require_auth: false
  },
  {
    tags: ['documentation'],
    summary: 'Swagger JSON description of the API',
    method: 'get',
    path: `${PREFIX}/swagger.json`,
    handler: swagger.index,
    require_auth: false
  },
  {
    tags: ['auth'],
    summary: 'Log in with email/password and get JWT token',
    method: 'post',
    path: `${PREFIX}/login`,
    handler: auth.login,
    require_auth: false
  },
  {
    tags: ['system'],
    summary: 'Get statistics on database data',
    method: 'get',
    path: `${PREFIX}/sys/db_stats`,
    handler: sys.dbStats
  }
].concat(modelRoutes.requireDir(MODELS_DIR, VERSION))

async function getRoutes (options = {}) {
  return concat(systemRoutes, (await dataRoutes(DATA_PREFIX, options)))
}

module.exports = {
  VERSION,
  PREFIX,
  getRoutes
}
