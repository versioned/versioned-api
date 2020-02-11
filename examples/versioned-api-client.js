const axios = require('axios')

const DEFAULT_CONFIG = {
  BASE_URL: 'http://localhost:3000/v1',
}

function json (value) {
  return JSON.stringify(value, null, 4)
}

async function request ({method = 'get', url, headers = {}, data}) {
  console.log(`http ${method} '${url}'`)
  try {
    return await axios.request({ method, url, data, headers })
  } catch (error) {
    console.log(`request error ${error.request.method} ${error.request.path} status=${error.response.status} error=${error.message} response.data=${json(error.response.data)}`, error)
    throw error
  }
}

async function login ({config}) {
  const credentials = { email: config.EMAIL, password: config.PASSWORD }
  console.log(`versioned-api.login email=${credentials.email}`)
  const result = await request({ method: 'post', url: `${config.BASE_URL}/login?getUser=1`, data: credentials })
  const token = result.data.data.token
  const headers = {Authorization: `Bearer ${token}`}
  return {token, headers}
}

async function create (config = {}) {
  config = Object.assign({}, config, DEFAULT_CONFIG)

  const headers = (await login({config})).headers

  function dataStats ({spaceId = config.SPACE_ID} = {}) {
    console.log(`versioned-api.dataStats spaceId=${spaceId}`)
    const url = `${config.BASE_URL}/data/${spaceId}/dbStats.json`
    return request({url, headers})
  }

  function dataImport ({spaceId = config.SPACE_ID, model = config.MODEL, docs}) {
    console.log(`versioned-api.dataImport model=${model} spaceId=${spaceId}`)
    const url = `${config.BASE_URL}/data/${spaceId}/import/${model}`
    const data = { docs }
    return request({method: 'post', url, data, headers})
  }

  function modelsList ({spaceId = config.SPACE_ID, model = config.MODEL} = {}) {
    console.log(`versioned-api.modelsList model=${model.coll} spaceId=${spaceId}`)
    const url = `${config.BASE_URL}/${spaceId}/models`
    return request({url, headers})
  }

  function modelsGet ({spaceId = config.SPACE_ID, id} = {}) {
    console.log(`versioned-api.modelsGet id=${id} spaceId=${spaceId}`)
    const url = `${config.BASE_URL}/${spaceId}/models/${id}`
    return request({url, headers})
  }

  function modelsCreate ({spaceId = config.SPACE_ID, model}) {
    console.log(`versioned-api.modelsCreate model=${model.coll} spaceId=${spaceId}`)
    const url = `${config.BASE_URL}/${spaceId}/models`
    const data = model
    return request({method: 'post', url, data, headers})
  }

  return {
    dataStats,
    dataImport,
    modelsList,
    modelsGet,
    modelsCreate
  }
}

module.exports = create
