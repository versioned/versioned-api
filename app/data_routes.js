const {zipObj, rename, property, concat, getIn, keys, keyValues, merge} = require('lib/util')
const models = require('app/models/models')
const modelController = require('lib/model_controller')
const config = require('app/config')
const {logger, mongo} = config.modules
const responseModule = config.modules.response
const {notFound} = config.modules.response
const swaggerHandler = require('app/controllers/swagger').index
const {wrapData, jsonResponse} = config.modules.response
const {idType} = require('lib/model_meta')
const {requestSchema, responseSchema} = require('lib/model_access')
const {LIST_PARAMETERS} = require('app/model_routes')
const changelog = require('app/models/changelog')
const DEFAULTS = require('lib/model_spec').DEFAULTS

const PARAMS = {
  // spaceId: ['spaceId'],
  model: ['model', 'coll']
}

function withParams (path, options = {}) {
  return keys(PARAMS).reduce((result, param) => {
    return options[param] ? result.replace(`:${param}`, getIn(options, PARAMS[param])) : result
  }, path)
}

function tokenParameter () {
  return {
    name: 'token',
    description: 'User auth header with JWT token on the format "Bearer {token}"',
    in: 'query',
    required: false,
    schema: {
      type: 'string'
    }
  }
}

function spaceIdParameter () {
  return {
    name: 'spaceId',
    in: 'path',
    required: true,
    schema: {
      type: 'string'
    }
  }
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
  const readParameters = [tokenParameter()]
  const listParameters = concat(LIST_PARAMETERS, [spaceIdParameter()])
  const getParameters = concat(listParameters, idParameter(model))
  return {
    list: concat(readParameters, listParameters),
    get: concat(readParameters, getParameters),
    create: listParameters,
    update: getParameters,
    delete: getParameters
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

function dbStatsPath (prefix, options) {
  return withParams(`/${prefix}/:spaceId/dbStats.json`, options)
}

function dataHandler (coll, endpoint) {
  async function _dataHandler (req, res) {
    const query = {
      spaceId: req.params.spaceId,
      coll
    }
    const model = await models.get(query)
    if (model) {
      const api = await models.getApi(req.space, model)
      const options = {scope: 'spaceId'}
      modelController(api, config.modules.response, options)[endpoint](req, res)
    } else {
      notFound(res)
    }
  }
  return _dataHandler
}

function swaggerRoute (prefix, options) {
  return {
    summary: 'Swagger JSON description of the data API for a particular space',
    tags: ['data'],
    method: 'get',
    path: swaggerPath(prefix),
    handler: swaggerHandler,
    parameters: [spaceIdParameter()]
  }
}

async function dbStatsHandler (req, res) {
  const modelSpecs = await models.list({spaceId: req.space.id})
  const colls = modelSpecs.map(model => getIn(model, 'model.coll'))
  const types = modelSpecs.map(property('coll'))
  const collsToTypes = zipObj(colls, types)
  const stats = await mongo.dbStats({colls})
  const statsByType = rename(stats, collsToTypes)
  jsonResponse(req, res, wrapData(statsByType))
}

function dbStatsRoute (prefix, options) {
  return {
    summary: 'Database stats (number of documents per collection) for the space',
    tags: ['data'],
    method: 'get',
    path: dbStatsPath(prefix),
    handler: dbStatsHandler,
    parameters: [spaceIdParameter()]
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

async function modelRoutes (prefix, options = {}) {
  const modelCallbacks = require('lib/model_callbacks')(logger)
  const result = []
  const apiRoutes = getIn(options, 'api.model.routes', DEFAULTS.routes)
  const routes = keyValues(ROUTES).filter(r => apiRoutes.includes(r[0]))
  for (let [endpoint, route] of routes) {
    const summary = options.model ? `${endpoint} ${options.model.coll} data` : `${endpoint} data`
    const handler = options.handler ? options.handler(endpoint) : dataHandler(options.model.coll, endpoint)
    route = merge(route, {
      action: endpoint,
      tags: ['data'],
      path: route.path(prefix, options),
      handler,
      summary,
      parameters: parameters(options.model, endpoint),
      requestSchema: requestSchema(getIn(options, ['api', 'model']), endpoint),
      responseSchema: responseSchema(getIn(options, ['api', 'model']), endpoint)
    })
    if (options.api) {
      route = await modelCallbacks(options.api, route, 'after', 'routeCreate')
    }
    result.push(route)
  }
  return result
}

async function getChangelogRoutes (prefix, options) {
  const controller = modelController(changelog, responseModule, {scope: 'spaceId'})
  const handler = (endpoint) => controller[endpoint]
  const model = {coll: changelog.model.coll, model: changelog.model}
  const routes = await modelRoutes(prefix, merge(options, {handler, model, api: changelog}))
  return routes
}

async function routes (prefix, options = {}) {
  if (options.space) {
    let spaceModels = await models.list({spaceId: options.space.id})
    if (options.models) spaceModels = spaceModels.concat(options.models)
    let result = [swaggerRoute(prefix, options), dbStatsRoute(prefix, options)]
    for (let model of spaceModels) {
      const api = await models.getApi(options.space, model)
      const routes = await modelRoutes(prefix, merge(options, {model, api}))
      result = result.concat(routes)
    }
    const changelogRoutes = await getChangelogRoutes(prefix, options)
    result = result.concat(changelogRoutes)
    return result
  } else {
    return [swaggerRoute(prefix, options)]
  }
}

module.exports = routes
