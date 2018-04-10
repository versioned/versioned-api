const {keyValues, merge} = require('lib/util')
const modelApi = require('lib/model_api')
const models = require('app/models/models')
const modelController = require('lib/model_controller')
const {notFound} = require('lib/response')

function listPath (prefix) {
  return `/${prefix}/:space_id/:model`
}

function getPath (prefix) {
  return `${listPath(prefix)}/:id`
}

function dataHandler (endpoint) {
  return async function (req, res) {
    const query = {
      space_id: parseInt(req.params.space_id),
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

function routes (prefix) {
  return keyValues(ROUTES).reduce((acc, [endpoint, route]) => {
    return acc.concat([merge(route, {
      path: route.path(prefix),
      handler: dataHandler(endpoint)
    })])
  }, [])
}

module.exports = routes
