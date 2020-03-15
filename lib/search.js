const {mapObj, truncated, json, merge, getIn} = require('lib/util')
const axios = require('axios')
const algoliasearch = require('algoliasearch')
const {titleProperty} = require('lib/model_meta')

const TITLE_LENGTH = 100

function getSharedIndexName (config, options = {}) {
  return [config.NODE_ENV, getIn(options, 'space.dbKey')].join('-')
}

function getIndexName (config, options = {}) {
  return getIn(options, 'space.algoliaIndexName') || getSharedIndexName(config, options)
}

// https://www.algolia.com/doc/guides/security/api-keys/#secured-api-keys
function getSharedApiKey (client, config, indexName) {
  if (!client) return undefined
  const validUntil = Math.round(Date.now() / 1000 + (3600 * 24 * 60)) // two months from now
  var params = {
    validUntil,
    userToken: indexName,
    restrictIndices: indexName
  }
  return client.generateSecuredApiKey(config.ALGOLIASEARCH_API_KEY_SEARCH, params)
}

function getTitle (model, doc) {
  const value = doc[titleProperty(model)]
  const truncate = (k, v) => truncated(v, TITLE_LENGTH)
  return typeof value === 'object' ? mapObj(value, truncate) : truncate(null, value)
}

function searchDoc (model, spaceId, doc) {
  const objectID = [model.type, doc.id].join('-')
  const _title = getTitle(model, doc) || objectID
  return merge(doc, {
    objectID,
    spaceId,
    _title
  })
}

// See: https://www.algolia.com/doc/rest-api/search/
function search (config, options = {}) {
  const applicationId = getIn(options, 'space.algoliaApplicationId') || config['ALGOLIASEARCH_APPLICATION_ID']
  const apiKey = getIn(options, 'space.algoliaApiKey') || config['ALGOLIASEARCH_API_KEY']
  const enabled = applicationId && apiKey
  const client = enabled && algoliasearch(applicationId, apiKey)
  const spaceId = getIn(options, 'space.id')
  const indexName = getIndexName(config, options)
  const sharedIndexName = getSharedIndexName(config, options)
  const sharedApiKey = getSharedApiKey(client, config, indexName)
  const headers = {
    'X-Algolia-Application-Id': applicationId,
    'X-Algolia-API-Key': apiKey
  }
  const baseUrl = `https://${applicationId}.algolia.net`

  function indexUrl (indexName, operation = null) {
    const url = `${baseUrl}/1/indexes/${indexName}`
    return operation ? `${url}/${operation}` : url
  }

  function objectUrl (indexName, objectId) {
    return `${baseUrl}/1/indexes/${indexName}/${objectId}`
  }

  async function setup () {
    if (!enabled) return
    const url = `${baseUrl}/1/indexes/${indexName}/settings`
    const body = {
      attributesForFaceting: ['filterOnly(type)', 'filterOnly(spaceId)']
    }
    config.modules.logger.debug(`search: setup url=${url}`)
    try {
      const result = await axios.put(url, body, {headers})
      config.modules.logger.debug(`search: setup result.status=${result.status}`)
      return result
    } catch (error) {
      config.modules.logger.error(`search: setup error=${error.message}`, error)
    }
  }

  async function save (model, doc) {
    if (!enabled) return
    const sDoc = searchDoc(model, spaceId, doc)
    const url = objectUrl(indexName, sDoc.objectID)
    config.modules.logger.debug(`search: ${model.type}.save url=${url} sDoc=${json(sDoc)}`)
    try {
      const result = await axios.put(url, sDoc, {headers})
      config.modules.logger.debug(`search: ${model.type}.save result.status=${result.status}`)
      return result
    } catch (error) {
      config.modules.logger.error(`search: ${model.type}.save error=${error.message}`, error)
    }
  }

  async function _delete (model, doc) {
    if (!enabled) return
    const sDoc = searchDoc(model, spaceId, doc)
    const url = objectUrl(indexName, sDoc.objectID)
    config.modules.logger.debug(`search: ${model.type}.delete url=${url}`)
    try {
      const result = await axios.delete(url, {headers})
      config.modules.logger.debug(`search: ${model.type}.delete result.status=${result.status}`)
      return result
    } catch (error) {
      config.modules.logger.error(`search: ${model.type}.delete error=${error.message}`, error)
    }
  }

  async function clearIndex () {
    if (!enabled) return
    const url = indexUrl(indexName, 'clear')
    config.modules.logger.debug(`search: clearIndex url=${url}`)
    try {
      const result = await axios.post(url, {}, {headers})
      config.modules.logger.debug(`search: clearIndex result.status=${result.status} result.data=${json(result.data)}`)
      return result
    } catch (error) {
      config.modules.logger.error(`search: clearIndex error=${error.message}`, error)
    }
  }

  async function deleteIndex () {
    if (!enabled) return
    const url = indexUrl(indexName)
    config.modules.logger.debug(`search: deleteIndex url=${url} headers=${json(headers)}`)
    try {
      const result = await axios.delete(url, {headers})
      config.modules.logger.debug(`search: deleteIndex result.status=${result.status} result.data=${json(result.data)}`)
      return result
    } catch (error) {
      config.modules.logger.error(`search: deleteIndex error=${error.message}`, error)
    }
  }

  return {
    sharedIndexName,
    indexName,
    sharedApiKey,
    enabled,
    setup,
    save,
    delete: _delete,
    clearIndex,
    deleteIndex
  }
}

module.exports = search
