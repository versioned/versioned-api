const home = require('app/controllers/home')
const swagger = require('app/controllers/swagger')
const auth = require('app/controllers/auth')
const sys = require('app/controllers/sys')
const {nil, getIn, concat} = require('lib/util')
const config = require('app/config')
const modelRoutes = require('app/model_routes')(config.modules.response)
const getDataRoutes = require('app/data_routes')
const path = require('path')
const router = require('lib/router')
const spaces = require('app/models/spaces')
const accounts = require('app/models/accounts')
const {accessError} = require('app/errors')

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
    requireAuth: false
  },
  {
    tags: ['documentation'],
    summary: 'Swagger JSON description of the API',
    method: 'get',
    path: `${PREFIX}/swagger.json`,
    handler: swagger.index,
    requireAuth: false
  },
  {
    tags: ['auth'],
    summary: 'Log in with email/password and get JWT token',
    method: 'post',
    path: `${PREFIX}/login`,
    handler: auth.login,
    requireAuth: false
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
  const dataRoutes = await getDataRoutes(DATA_PREFIX, options)
  return concat(dataRoutes, systemRoutes)
}

function parseSpaceId (req) {
  const SPACE_ID_PATTERN = new RegExp(`${DATA_PREFIX}/([a-f0-9]{24})/`)
  const match = req.url.match(SPACE_ID_PATTERN)
  return match && match[1]
}

function checkAccess (req) {
  const {route, user, account} = req
  if (route.requireAuth === false ||
    getIn(route, 'model.schema.x-meta.checkAccess') === false ||
    getIn(user, 'superUser')) {
    return undefined
  }
  if (!account) return accessError('No account ID is associated with that endpoint so it requires super user access')
  let message
  const accountId = account._id.toString()
  const role = getIn((user.accounts || []).find(a => a.id === accountId), 'role')
  const modelName = getIn(route, ['model', 'coll'])
  const writeRequiresAdmin = (getIn(route, 'model.schema.x-meta.writeRequiresAdmin') !== false)
  if (nil(role)) {
    message = `You need to be granted access by an administrator to account ${account.name}`
  } else if (role === 'read' && req.method !== 'GET') {
    message = `You need to be granted write access by an administrator to update content in account ${account.name}`
  } else if (role === 'write' && writeRequiresAdmin) {
    message = `You need to be granted administrator access to update ${modelName}`
  }
  return accessError(message)
}

async function lookupRoute (req) {
  const spaceId = parseSpaceId(req)
  const space = spaceId && (await spaces.get(spaceId))
  if (space) req.space = space
  const routesByMethod = router.groupByMethod(await getRoutes({space}))
  const match = await router.lookupRoute(routesByMethod, req)
  const accountId = getIn(space, 'accountId') || getIn(match, 'params.accountId')
  if (accountId) req.account = await accounts.get(accountId)
  return match
}

module.exports = {
  VERSION,
  PREFIX,
  getRoutes,
  accessError,
  checkAccess,
  lookupRoute
}
