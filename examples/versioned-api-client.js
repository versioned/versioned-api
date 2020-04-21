const axios = require('axios')

const DEFAULT_CONFIG = {
  BASE_URL: 'http://localhost:3000/v1',
  EMAIL: null,
  PASSWORD: null
}

function chunk (docs, size = 100) {
  if (!docs) return undefined;
  const result = []
  const nChunks = Math.ceil(docs.length / size)
  for (let i = 0; i < nChunks; i++) {
    const offset = i * size;
    result.push(docs.slice(offset, offset + size))
  }
  return result;
}

function json (value) {
  return JSON.stringify(value, null, 4)
}

function urlWithQuery (url, query) {
  if (query && Object.keys(query).length > 0) {
    const sep = (url.includes('?') ? '&' : '?')
    const queryString = Object.entries(query).map(([key, value]) => {
      return [key, value].map(encodeURIComponent).join('=')
    }).join('&')
    return url + sep + queryString
  } else {
    return url
  }
}

function getConfig (defaultConfig) {
  const missingKeys = []
  const envKey = (key) => `VERSIONED_${key}`
  const config = Object.keys(defaultConfig).reduce((acc, key) => {
      acc[key] = process.env[envKey(key)] || defaultConfig[key]
      if (acc[key] == null) missingKeys.push(envKey(key))
      return acc
  }, {})
  if (missingKeys.length > 0) throw new Error(`You need to provide the following environment variables: ${missingKeys.join(', ')}`)
  return config
}

async function request ({method = 'get', url, headers = {}, data, query = {}, validateStatus}) {
  url = urlWithQuery(url, query)
  validateStatus = validateStatus || ((status) => status === 200)
  console.log(`http ${method} '${url}' Authorization:"${headers.Authorization}"`)
  try {
    return await axios.request({ method, url, data, headers, validateStatus })
  } catch (error) {
    console.log(`request error ${error.request.method} ${error.request.path} status=${error.response.status} error=${error.message} response.data=${json(error.response.data)}`, error)
    throw error
  }
}

async function login ({config}) {
  const credentials = { email: config.EMAIL, password: config.PASSWORD }
  console.log(`versioned-api.login email=${credentials.email}`)
  const result = await request({ method: 'post', url: `${config.BASE_URL}/login?getUser=1`, data: credentials })
  const accountId = result.data.data.user.accounts[0].id
  const token = result.data.data.token
  const headers = {Authorization: `Bearer ${token}`}
  return {token, accountId, headers}
}

async function create (config = {}) {
  config = getConfig(Object.assign({}, config, DEFAULT_CONFIG))
  const {headers, accountId} = await login({config})
  config.ACCOUNT_ID = config.ACCOUNT_ID || accountId

  function dataStats ({spaceId = config.SPACE_ID} = {}) {
    console.log(`versioned-api.dataStats spaceId=${spaceId}`)
    const url = `${config.BASE_URL}/data/${spaceId}/dbStats.json`
    return request({url, headers}).then(response => response.data)
  }

  async function dataImport ({spaceId = config.SPACE_ID, model = config.MODEL, docs}) {
    const docsChunks = chunk(docs, 50)
    console.log(`versioned-api.dataImport model=${model} spaceId=${spaceId} docs.length=${docs.length} nChunks=${docsChunks.length}`)
    const url = `${config.BASE_URL}/data/${spaceId}/import/${model}`
    let errorsCount = 0
    for (const [index, docsChunk] of docsChunks.entries()) {
      console.log(`versioned-api.dataImport model=${model} spaceId=${spaceId} importing chunk ${index + 1} of ${docsChunks.length}`)
      const data = { docs: docsChunk }
      const validateStatus = (status) => [422, 200].includes(status)
      const result = await request({method: 'post', url, data, headers, validateStatus})
      if (result.status === 422) {
        const errors = result.data.results.filter(r => r.error).map(r => r.error)
        errorsCount += errors.length
        console.log(`versioned-api.dataImport model=${model} spaceId=${spaceId} errors.length=${errors.length} errors=${json(errors)}`)
      }
    }
    console.log(`versioned-api.dataImport model=${model} spaceId=${spaceId} complete docs.length=${docs.length} errorsCount=${errorsCount}`)
  }

  function spacesList ({accountId = config.ACCOUNT_ID, query = {}} = {}) {
    console.log(`versioned-api.spacesList accountId=${accountId}`)
    const url = `${config.BASE_URL}/${accountId}/spaces`
    return request({url, headers, query}).then(response => response.data)
  }

  function spacesFind(options = {}) {
    return spacesList(options).then(data => data.data[0])
  }

  function modelsList ({spaceId = config.SPACE_ID, query = {}} = {}) {
    console.log(`versioned-api.modelsList spaceId=${spaceId}`)
    const url = `${config.BASE_URL}/${spaceId}/models`
    return request({url, headers, query}).then(response => response.data)
  }

  function modelsFind(options = {}) {
    return modelsList(options).then(data => data.data[0])
  }

  function modelsGet ({spaceId = config.SPACE_ID, id} = {}) {
    console.log(`versioned-api.modelsGet id=${id} spaceId=${spaceId}`)
    const url = `${config.BASE_URL}/${spaceId}/models/${id}`
    return request({url, headers}).then(response => response.data)
  }

  async function modelsCreate ({spaceId = config.SPACE_ID, model, deleteIfExists}) {
    console.log(`versioned-api.modelsCreate model=${model.coll} spaceId=${spaceId}`)
    if (deleteIfExists) {
      const existingModel = await modelsFind({
        spaceId,
        query: { "filter.coll": model.coll }
      });
      if (existingModel) {
        await modelsDelete({ spaceId, id: existingModel.id });
      }
    }
    const url = `${config.BASE_URL}/${spaceId}/models`
    const data = model
    return request({method: 'post', url, data, headers}).then(response => response.data)
  }

  function modelsDelete ({spaceId = config.SPACE_ID, model = config.MODEL, id}) {
    console.log(`versioned-api.modelsDelete model=${model} id=${id} spaceId=${spaceId}`)
    const url = `${config.BASE_URL}/${spaceId}/models/${id}`
    return request({method: 'delete', url, headers}).then(response => response.data)
  }

  return {
    config,
    dataStats,
    dataImport,
    spacesList,
    spacesFind,
    modelsList,
    modelsFind,
    modelsGet,
    modelsCreate,
    modelsDelete
  }
}

module.exports = {
  getConfig,
  create
}
