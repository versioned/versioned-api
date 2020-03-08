const axios = require('axios')
const {getIn, json, compact, merge, deepRename} = require('lib/util')
const {notImplementedError} = require('lib/errors')
const modelSpec = require('lib/model_spec')
const {SILENT_LOGGER} = require('lib/logger')

function externalModelApi (model, _mongo, logger = SILENT_LOGGER) {
  if (!model.generated) model = modelSpec.generate(model)

  function interpolateParams (url, params) {
    return url && url.replace(/\{[a-z0-9_-]+\}/gi, (match) => {
      const name = match.substring(1, match.length - 1)
      const value = params && params[name]
      return value == null ? '' : encodeURIComponent(value)
    })
  }

  function getUrl (route, params) {
    const url = getIn(model, `routes.${route}.url`)
    if (!url) {
      throw notImplementedError(`External model ${model.type} is missing a routes.${route}.url property`)
    }
    return interpolateParams(url, params)
  }

  function decorateDoc (doc, route) {
    // TODO: set id based on x-meta.id here?
    const systemProps = {type: model.type}
    const renames = getIn(route, 'renameProperties', {})
    return merge(deepRename(doc, renames), systemProps)
  }

  async function list (query = {}, options = {}) {
    let data
    let docs
    let count
    const ids = getIn(query, 'id.$in')
    if (ids) {
      logger.debug(`external_model_api: ${model.type}.list ids=${ids.join(',')}`)
      docs = compact(await Promise.all(ids.map(id => get(id, options))))
    } else {
      const routeName = getIn(options, 'queryParams.q') ? 'search' : 'list'
      const route = getIn(model, `routes.${routeName}`, {})
      const { dataPath, countPath, headers } = route
      const url = getUrl(routeName, options.queryParams)
      logger.debug(`external_model_api: ${model.type}.list url=${url}`)
      data = (await axios.request({url, headers})).data
      docs = dataPath ? getIn(data, dataPath) : data
      docs = docs && docs.map(doc => decorateDoc(doc, route))
      count = (countPath && getIn(data, countPath)) || docs.length
    }
    if (options.count) {
      return {count, data: docs}
    } else {
      return docs
    }
  }

  async function get (queryOrId, options = {}) {
    const route = getIn(model, 'routes.get', {})
    const id = typeof queryOrId === 'object' ? queryOrId.id : queryOrId
    if (typeof id !== 'string') throw notImplementedError(`External model ${model.type} - can only get document with string id but got ${json(queryOrId)}`)
    const url = getUrl('get', merge(options.queryParams, {id}))
    const {dataPath, headers} = getIn(model, 'routes.get', {})
    logger.debug(`external_model_api: ${model.type}.get url=${url}`)
    const validateStatus = status => [404, 200].includes(status)
    let {data} = await axios.request({url, headers, validateStatus})
    if (dataPath) data = getIn(data, dataPath)
    return data && decorateDoc(data, route)
  }

  async function create (doc, options = {}) {
    // TODO: implement?
  }

  async function update (queryOrId, doc, options = {}) {
    // TODO: implement?
  }

  async function _delete (queryOrId, options = {}) {
    // TODO: implement?
  }

  async function dbStats (options = {}) {
    return {}
  }

  const api = {
    model,
    list,
    get,
    create,
    update,
    delete: _delete,
    dbStats
  }
  return api
}

module.exports = externalModelApi
