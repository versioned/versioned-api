const home = require('app/controllers/home')
const swagger = require('app/controllers/swagger')
const auth = require('app/controllers/auth')
const sys = require('app/controllers/sys')
const {concat} = require('lib/util')
const config = require('app/config')
const modelRoutes = require('lib/model_routes')(config.modules.response)
const dataRoutes = require('app/data_routes')
const path = require('path')
const router = require('lib/router')
const spaces = require('app/models/spaces')

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
  return concat((await dataRoutes(DATA_PREFIX, options)), systemRoutes)
}

function parseSpaceId (req) {
  const SPACE_ID_PATTERN = new RegExp(`${DATA_PREFIX}/([a-f0-9]{24})/`)
  const match = req.url.match(SPACE_ID_PATTERN)
  return match && match[1]
}

async function lookupRoute (req) {
  const spaceId = parseSpaceId(req)
  const space = spaceId && (await spaces.get(spaceId))
  if (space) req.space = space
  const routesByMethod = router.groupByMethod(await getRoutes({space}))
  const match = await router.lookupRoute(routesByMethod, req)
  return match
}

module.exports = {
  VERSION,
  PREFIX,
  getRoutes,
  lookupRoute
}
