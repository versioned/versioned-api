const {json, merge, getIn} = require('lib/util')
const axios = require('axios')
const {titleProperty} = require('lib/model_meta')

function getConfig (key, config, options = {}) {
  return getIn(options, `space.config.${key}`, config[key])
}

function getIndexName (config, options = {}) {
  if (getIn(options, 'space.config.ALGOLIASEARCH_APPLICATION_ID')) {
    return getIn(options, 'space.dbKey')
  } else {
    return config.ALGOLIASEARCH_INDEX_NAME
  }
}

// function isSearchable (model) {
//   return getIn(model, 'features', []).includes('search')
// }

function searchDoc (model, doc) {
  const title = doc[titleProperty(model)]
  const objectID = [model.type, doc.id].join('-')
  return merge(doc, {
    title,
    objectID
  })
}

// function indexBody (docs) {
//   const requests = docs.map((doc) => {
//     return {
//       action: 'updateObject',
//       body: searchDoc(doc)
//     }
//   })
//   return {requests}
// }

// See: https://www.algolia.com/doc/rest-api/search/
function search (config, options = {}) {
  const applicationId = getConfig('ALGOLIASEARCH_APPLICATION_ID', config, options)
  const apiKey = getConfig('ALGOLIASEARCH_API_KEY', config, options)
  const indexName = getIndexName(config, options)
  const headers = {
    'X-Algolia-Application-Id': applicationId,
    'X-Algolia-API-Key': apiKey
  }
  const baseUrl = `https://${applicationId}.algolia.net`
  const enabled = applicationId && apiKey

  function indexUrl (indexName, operation) {
    return `${baseUrl}/1/indexes/${indexName}/${operation}`
  }

  function objectUrl (indexName, objectId) {
    return `${baseUrl}/1/indexes/${indexName}/${objectId}`
  }

  async function setup () {
    if (!enabled) return
    const url = `${baseUrl}/1/indexes/${indexName}/settings`
    const body = {
      attributesForFaceting: ['filterOnly(type)']
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
    const sDoc = searchDoc(model, doc)
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
    const sDoc = searchDoc(model, doc)
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

  return {
    enabled,
    setup,
    save,
    delete: _delete,
    clearIndex
  }
  // (defn index-add-coll [app coll]
  //   (let [docs (db/find (:database app) coll {} {:per-page 50000})
  //         requests (map (partial index-request app) docs)
  //         body {:requests requests}
  //         url (index-url (application-id app) (index-name app) :batch)]
  //     (println "search/index-add-coll" coll (count requests) url)
  //     (client/post url {:headers (headers app) :form-params body :content-type :json :as :json})))
  //
  // (defn index-clear [app]
  //   (let [url (index-url (application-id app) (index-name app) :clear)]
  //     (println "search/index-clear" url)
  //     (client/post url {:headers (headers app)})))
  //
  // (defn index-rebuild [app]
  //   (index-clear app)
  //   (doseq [coll (colls app)]
  //     (index-add-coll app coll)))
}

module.exports = search
