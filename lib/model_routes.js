const fs = require('fs')
const path = require('path')
const {flatten, keyValues, merge, pick} = require('lib/util')
const modelController = require('lib/model_controller')

const DEFAULT_VERSION = 'v1'
const DEFAULT_REQUIRE_PATH = 'app/models'

function listPath (model, prefix) {
  return `/${prefix}/${model.coll}`
}

function getPath (model, prefix) {
  return `${listPath(model, prefix)}/:id`
}

const ROUTES = {
  list: {
    method: 'get',
    path: listPath
  },
  get: {
    method: 'get',
    path: getPath
  },
  create: {
    method: 'post',
    path: listPath
  },
  update: {
    method: 'put',
    path: getPath
  },
  delete: {
    method: 'delete',
    path: getPath
  }
}

function requireModelApis (modelsDir, modelsRequirePath = DEFAULT_REQUIRE_PATH) {
  const requirePaths = fs.readdirSync(modelsDir).map(filename => {
    const modelName = path.parse(filename).name
    return path.join(modelsRequirePath, modelName)
  })
  return requirePaths.map(path => require(path))
}

function routes (modelApi, prefix = DEFAULT_VERSION) {
  const model = modelApi.model
  if (!model.routes) return []
  const controller = modelController(modelApi)
  return keyValues(pick(ROUTES, model.routes)).reduce((acc, [key, route]) => {
    return acc.concat([merge(route, {
      model,
      path: route.path(model, prefix),
      handler: controller[key]
    })])
  }, [])
}

function requireDir (modelsDir, prefix = DEFAULT_VERSION, modelsRequirePath = DEFAULT_REQUIRE_PATH) {
  const modelApis = requireModelApis(modelsDir, modelsRequirePath)
  return flatten(modelApis.map(modelApi => routes(modelApi, prefix)))
}

module.exports = {
  routes,
  requireDir
}
