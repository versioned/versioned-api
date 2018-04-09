const home = require('app/controllers/home')
const auth = require('app/controllers/auth')
const {concat} = require('lib/util')
const modelRoutes = require('lib/model_routes')
const dataRoutes = require('lib/data_routes')
const path = require('path')

const VERSION = 'v1'
const DATA_PREFIX = `${VERSION}/data`
const MODELS_DIR = path.join(__dirname, '/models')

const systemRoutes = [
  {
    method: 'get',
    path: '/',
    handler: home.index
  },
  {
    method: 'post',
    path: `/${VERSION}/login`,
    handler: auth.login
  }
].concat(modelRoutes.requireDir(MODELS_DIR, VERSION))

async function getRoutes () {
  return concat(systemRoutes, dataRoutes(DATA_PREFIX))
}

module.exports = {
  getRoutes
}
