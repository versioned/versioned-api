const fs = require('fs')
const path = require('path')
const {flatten, keyValues, merge, pick} = require('lib/util')
const modelController = require('lib/model_controller')
const {idType} = require('lib/model_meta')
const {requestSchema, responseSchema} = require('lib/model_access')

const DEFAULT_VERSION = 'v1'
const DEFAULT_REQUIRE_PATH = 'app/models'

function listPath (model, prefix) {
  return `/${prefix}/${model.coll}`
}

function getPath (model, prefix) {
  return `${listPath(model, prefix)}/:id`
}

function idParameter (model) {
  return {
    name: 'id',
    in: 'path',
    required: true,
    schema: {
      type: idType(model)
    }
  }
}

const LIST_PARAMETERS = [
  {
    name: 'limit',
    description: 'Maximum number of documents to return - for pagination',
    in: 'query',
    required: false,
    schema: {
      type: 'integer'
    }
  },
  {
    name: 'skip',
    description: 'Offset - for pagination',
    in: 'query',
    required: false,
    schema: {
      type: 'integer'
    }
  },
  {
    name: 'order',
    description: 'Comma separated fields to sort by. Prefix field by minus sign for descending sort',
    in: 'query',
    required: false,
    schema: {
      type: 'string'
    }
  }
]

function parameters (model, endpoint) {
  return {
    list: LIST_PARAMETERS,
    get: [idParameter(model)],
    create: [],
    update: [idParameter(model)],
    delete: [idParameter(model)]
  }[endpoint]
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

function modelRoutes (responseModule) {
  function routes (modelApi, prefix = DEFAULT_VERSION) {
    const model = modelApi.model
    if (!model.routes) return []
    const controller = modelController(modelApi, responseModule)
    return keyValues(pick(ROUTES, model.routes)).reduce((acc, [endpoint, route]) => {
      return acc.concat([merge(route, {
        summary: `${endpoint} ${model.coll}`,
        model,
        path: route.path(model, prefix),
        handler: controller[endpoint],
        parameters: parameters(model, endpoint),
        requestSchema: requestSchema(model, endpoint),
        responseSchema: responseSchema(model, endpoint)
      })])
    }, [])
  }

  function requireDir (modelsDir, prefix = DEFAULT_VERSION, modelsRequirePath = DEFAULT_REQUIRE_PATH) {
    const modelApis = requireModelApis(modelsDir, modelsRequirePath)
    return flatten(modelApis.map(modelApi => routes(modelApi, prefix)))
  }

  return {
    routes,
    requireDir
  }
}

module.exports = modelRoutes
