const fs = require('fs')
const path = require('path')
const {flatten, keyValues, merge, pick} = require('lib/util')
const modelController = require('lib/model_controller')

function getPath (model, version) {
  return `/${version}/${model.coll}/:id`
}

function listPath (model, version) {
  return `/${version}/${model.coll}`
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

function requireModelApis (modelsDir, modelsRequirePath) {
  const requirePaths = fs.readdirSync(modelsDir).map(filename => {
    const modelName = path.parse(filename).name
    return path.join(modelsRequirePath, modelName)
  })
  return requirePaths.map(path => require(path))
}

function routes (modelApi, version) {
  const model = modelApi.model
  if (!model.routes) return []
  const controller = modelController(modelApi)
  return keyValues(pick(ROUTES, model.routes)).reduce((acc, [key, route]) => {
    return acc.concat([merge(route, {
      path: route.path(model, version),
      handler: controller[key]
    })])
  }, [])
}

function modelRoutes (modelsDir, modelsRequirePath = 'app/models', version = 'v1') {
  const modelApis = requireModelApis(modelsDir, modelsRequirePath)
  return flatten(modelApis.map(modelApi => routes(modelApi, version)))
}

module.exports = modelRoutes
