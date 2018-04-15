const {getIn, keys, keyValues, merge, flatten, parseIfInt} = require('lib/util')
const modelApi = require('lib/model_api')
const models = require('app/models/models')
const modelController = require('lib/model_controller')
const config = require('app/config')
const {notFound} = config.modules.response
const swaggerHandler = require('app/controllers/swagger').index
const {idType} = require('lib/model_meta')
const {requestSchema, responseSchema} = require('lib/model_access')

const PARAMS = {
  spaceId: ['spaceId'],
  model: ['model', 'coll']
}

function withParams (path, options = {}) {
  return keys(PARAMS).reduce((result, param) => {
    return options[param] ? result.replace(`:${param}`, getIn(options, PARAMS[param])) : result
  }, path)
}

function idParameter (model) {
  return {
    name: 'id',
    in: 'path',
    required: true,
    schema: {
      type: (model ? idType(model.model) : 'string')
    }
  }
}

function parameters (model, endpoint) {
  return {
    list: [],
    get: [idParameter(model)],
    create: [],
    update: [idParameter(model)],
    delete: [idParameter(model)]
  }[endpoint]
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
      spaceId: parseIfInt(req.params.spaceId),
      coll: req.params.model
    }
    const model = await models.findOne(query)
    if (model) {
      const api = modelApi(model.model, config.logger)
      modelController(api, config.modules.response)[endpoint](req, res)
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
    const summary = options.model ? `${endpoint} ${options.model.coll} data` : `${endpoint} data`
    return acc.concat([merge(route, {
      tags: ['data'],
      path: route.path(prefix, options),
      handler: dataHandler(endpoint),
      summary,
      parameters: parameters(options.model, endpoint),
      requestSchema: requestSchema(getIn(options, ['api', 'model']), endpoint),
      responseSchema: responseSchema(getIn(options, ['api', 'model']), endpoint)
    })])
  }, [])
}

async function routes (prefix, options = {}) {
  if (options.spaceId) {
    let spaceModels = await models.list({spaceId: parseIfInt(options.spaceId)})
    if (options.models) spaceModels = spaceModels.concat(options.models)
    return [swaggerRoute(prefix, options)]
      .concat(flatten(spaceModels.map(model => {
        const api = modelApi(model.model)
        return modelRoutes(prefix, merge(options, {model, api}))
      })))
  } else {
    return [swaggerRoute(prefix, options)].concat(modelRoutes(prefix, options))
  }
}

module.exports = routes
