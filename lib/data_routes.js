const {keyValues, merge, flatten} = require('lib/util')
const modelApi = require('lib/model_api')
const models = require('app/models/models')
const modelController = require('lib/model_controller')
const {notFound} = require('lib/response')
const swaggerHandler = require('app/controllers/swagger').index

const PARAMS = ['spaceId', 'model']

function withParams (path, options = {}) {
  return PARAMS.reduce((result, param) => {
    return options[param] ? result.replace(`:${param}`, options[param]) : result
  }, path)
}

function listPath (prefix, options) {
  return withParams(`/${prefix}/:spaceId/:model`, options)
}

function getPath (prefix, options) {
  return withParams(`${listPath(prefix)}/:id`, options)
}

function swaggerPath (prefix, options) {
  return withParams(`/${prefix}/:spaceId/swagger.json`, options)
}

function dataHandler (endpoint) {
  return async function (req, res) {
    const query = {
      spaceId: parseInt(req.params.spaceId),
      coll: req.params.model
    }
    const model = await models.findOne(query)
    if (model) {
      const api = modelApi(model.model)
      modelController(api)[endpoint](req, res)
    } else {
      notFound(res)
    }
  }
}

function swaggerRoute (prefix, options) {
  return {
    summary: 'Swagger JSON description of the data API for a particular space',
    tags: ['data'],
    method: 'get',
    path: swaggerPath(prefix),
    handler: swaggerHandler
  }
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

function modelRoutes (prefix, options = {}) {
  return keyValues(ROUTES).reduce((acc, [endpoint, route]) => {
    const summary = options.model ? `${endpoint} ${options.model} data` : `${endpoint} data`
    return acc.concat([merge(route, {
      tags: ['data'],
      path: route.path(prefix, options),
      handler: dataHandler(endpoint),
      summary
    })])
  }, [])
}

async function routes (prefix, options = {}) {
  if (options.spaceId) {
    let spaceModels = await models.list({spaceId: parseInt(options.spaceId)})
    if (options.models) spaceModels = spaceModels.concat(options.models)
    return [swaggerRoute(prefix, options)]
      .concat(flatten(spaceModels.map(model => modelRoutes(prefix, merge(options, {model: model.coll})))))
  } else {
    return [swaggerRoute(prefix, options)].concat(modelRoutes(prefix, options))
  }
}

module.exports = routes
