const fs = require('fs')
const path = require('path')
const {keys, concat, flatten, keyValues, merge, pick} = require('lib/util')
const modelController = require('lib/model_controller')
const {idType} = require('lib/model_meta')
const {requestSchema, responseSchema} = require('lib/model_access')
const requireSpaces = () => require('app/models/spaces')

const DEFAULT_VERSION = 'v1'
const DEFAULT_REQUIRE_PATH = 'app/models'

function getScope (model) {
  const names = ['spaceId', 'accountId']
  for (let name of names) {
    const schema = model.schema.properties[name]
    if (schema) {
      return {name, schema}
    }
  }
}

function listPath (model, prefix) {
  const scope = getScope(model)
  if (scope) {
    return `/${prefix}/:${scope.name}/${model.coll}`
  } else {
    return `/${prefix}/${model.coll}`
  }
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
    name: 'sort',
    description: 'Comma separated fields to sort by. Prefix field by minus sign for descending sort',
    in: 'query',
    required: false,
    schema: {
      type: 'string'
    }
  },
  {
    name: 'filter',
    'x-meta': {
      namePattern: '^filter\\.'
    },
    description: 'Filters to query by, i.e. filter.published=true or filter.name=foobar or filter.updatedAt[lte]=2018-05-09T12:31:33Z',
    in: 'query',
    required: false,
    schema: {
      type: 'string'
    }
  },
  {
    name: 'dbStats',
    description: 'Include database statistics in the response',
    in: 'query',
    required: false,
    schema: {
      type: 'boolean'
    }
  }
]

function scopeParameter (model) {
  const scope = getScope(model)
  if (scope) {
    return {
      name: scope.name,
      in: 'path',
      required: true,
      schema: scope.schema
    }
  } else {
    return undefined
  }
}

function parameters (model, endpoint) {
  const params = {
    list: LIST_PARAMETERS,
    get: [idParameter(model)],
    create: [],
    update: [idParameter(model)],
    delete: [idParameter(model)]
  }[endpoint]
  const scopeParam = scopeParameter(model)
  return scopeParam ? concat([scopeParam], params) : params
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

function modelRoutes (responseModule, logger) {
  const modelCallbacks = require('lib/model_callbacks')(logger)

  async function routes (modelApi, prefix = DEFAULT_VERSION) {
    const model = modelApi.model
    if (!model.routes) return []
    const scope = getScope(model)
    const options = (scope ? {scope: scope.name} : {})
    const controller = modelController(model, requireSpaces().getApi, responseModule, options)
    const result = []
    for (let [endpoint, route] of keyValues(pick(ROUTES, keys(model.routes)))) {
      let modelRoute = [
        route,
        {
          summary: `${endpoint} ${model.coll}`,
          action: endpoint,
          model,
          path: route.path(model, prefix),
          handler: controller[endpoint],
          parameters: parameters(model, endpoint),
          requestSchema: requestSchema(model, endpoint),
          responseSchema: responseSchema(model, endpoint)
        },
        model.routes[endpoint]
      ].reduce(merge)
      modelRoute = await modelCallbacks(modelApi, modelRoute, 'after', 'routeCreate')
      result.push(modelRoute)
    }
    return result
  }

  async function requireDir (modelsDir, prefix = DEFAULT_VERSION, modelsRequirePath = DEFAULT_REQUIRE_PATH) {
    const modelApis = requireModelApis(modelsDir, modelsRequirePath)
    const result = []
    for (let modelApi of modelApis) {
      const apiRoutes = await routes(modelApi, prefix)
      result.push(apiRoutes)
    }
    return flatten(result)
  }

  return {
    routes,
    requireDir
  }
}

module.exports = Object.assign(modelRoutes, {
  LIST_PARAMETERS
})
