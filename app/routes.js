const home = require('app/controllers/home')
const auth = require('app/controllers/auth')
const {flatten, concat} = require('lib/util')
const modelRoutes = require('lib/model_routes')
const modelApi = require('lib/model_api')
const models = require('app/models/models')
const path = require('path')

const VERSION = 'v1'
const MODELS_DIR = path.join(__dirname, '/models')

const systemRoutes = [
  {
    method: 'get',
    path: '/',
    handler: home.index
  },
  {
    method: 'post',
    path: `/${VERSION}/sys_login`,
    handler: auth.login
  }
].concat(modelRoutes.requireDir(MODELS_DIR))

async function dynamicRoutes () {
  const dynamicModels = (await models.list()).map(t => modelApi(t.model))
  return flatten(dynamicModels.map(m => modelRoutes.routes(m, VERSION)))
}

async function getRoutes () {
  return concat(systemRoutes, (await dynamicRoutes()))
}

module.exports = {
  systemRoutes,
  dynamicRoutes,
  getRoutes
}
