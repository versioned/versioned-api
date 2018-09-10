#!/usr/bin/env node
// This is an example script that illustrates how some simple data can be imported
// into the Versioned CMS.
//
// Example usage:
//
// ACCOUNT_NAME="Awesome Company" EMAIL=joe@example.com FROM_URL=https://my-api.example.com/v1 FROM_PASSWORD=my-password PASSWORD=my-other-password examples/import-data.js

const axios = require('axios')

const DEFAULT_CONFIG = {
  VERSIONED_URL: 'https://api.versioned.io/v1'
}

function prettyJson (value) {
  return JSON.stringify(value, null, 4)
}

function config (key) {
  const value = process.env[key] || DEFAULT_CONFIG[key]
  if (!value) throw `You need to provide environment variable ${key}`
  return value
}

function logRequestError (error) {
  console.log(`request error ${error.request.method} ${error.request.path} status=${error.response.status} error=${error.message} response.data=${prettyJson(error.response.data)}`, error)
}

async function getRequest (url, options = {}) {
  console.log(`request: GET ${url} options=${prettyJson(options)}`)
  try {
    return await axios.get(url, options)
  } catch (error) {
    logRequestError(error)
    throw error
  }
}

async function postRequest (url, data, options = {}) {
  console.log(`request: POST ${url} options=${prettyJson(options)}`)
  try {
    return await axios.post(url, data, options)
  } catch (error) {
    logRequestError(error)
    throw error
  }
}

async function fromLogin () {
  const credentials = {email: config('EMAIL'), password: config('FROM_PASSWORD')}
  let result = await postRequest(`${config('FROM_URL')}/login`, credentials)
  const token = result.data.data.attributes.access_token
  const headers = {Authorization: `Bearer ${token}`}
  return {headers}
}

async function createUser (credentials) {
  let result = await postRequest(`${config('VERSIONED_URL')}/users`, credentials)
  const user = result.data.data
  return user
}

async function login (credentials) {
  let result = await postRequest(`${config('VERSIONED_URL')}/login?getUser=1`, credentials)
  const token = result.data.data.token
  const headers = {Authorization: `Bearer ${token}`}
  return {headers}
}

async function createAccount (account, headers) {
  let result = await postRequest(`${config('VERSIONED_URL')}/accounts`, account, {headers})
  const user = result.data.data
  return user
}

async function createSpace (accountId, headers) {
  const importTime = new Date().toISOString()
  const name = `Import ${importTime}`
  const result = await postRequest(`${config('VERSIONED_URL')}/${accountId}/spaces`, {name}, {headers})
  const space = result.data.data
  return space
}

async function createModel (spaceId, headers, model) {
  const result = await postRequest(`${config('VERSIONED_URL')}/${spaceId}/models`, model, {headers})
  return result.data.data
}

async function getDocs (model, headers, page = 1) {
  const published = (model.features || []).includes('published')
  const result = await getRequest(`${config('FROM_URL')}/${model.coll}?sort=id&published=${published}&per-page=100&page=${page}`, {headers})
  return result.data.data
}

async function importDocs (model, docs, spaceId, headers) {
  const result = await postRequest(`${config('VERSIONED_URL')}/data/${spaceId}/import/${model.coll}`, {docs}, {headers, validateStatus: null})
  console.log(`${model.coll} import status=${result.status} counts=${prettyJson(result.data.counts)}`)
  return result.data
}

function mapDoc (fromDoc, model, mappings) {
  const docMappings = Object.assign({}, mappings.base, mappings[model.coll])
  return Object.entries(docMappings).reduce((acc, [to, from]) => {
    if (typeof from === 'string') {
      acc[to] = fromDoc[from]
    } else if (from === true) {
      acc[to] = fromDoc[to]
    } else if (typeof from === 'function') {
      acc[to] = from(fromDoc)
    } else {
      acc[to] = from
    }
    return acc
  }, {})
}

const BlogPost = {
  name: 'Blog Post',
  coll: 'blog_posts',
  features: ['published'],
  model: {
    schema: {
      type: 'object',
      'x-meta': {
        idSequence: true
      },
      properties: {
        // sequence: {type: 'integer', 'x-meta': {sequence: true, unique: true, writable: false}},
        title: {type: 'string', maxLength: 256},
        body: {type: 'string', maxLength: 50000}
      },
      required: ['title', 'body'],
      additionalProperties: false
    }
  }
}

const Diary = {
  name: 'Diary',
  coll: 'diary',
  model: {
    schema: {
      type: 'object',
      'x-meta': {
        idSequence: true
      },
      properties: {
        // sequence: {type: 'integer', 'x-meta': {sequence: true, unique: true, writable: false}},
        body: {type: 'string', maxLength: 50000}
      },
      required: ['body'],
      additionalProperties: false
    }
  }
}

const mappings = {
  base: {
    id: (d) => d.id.toString(),
    // sequence: 'id',
    createdAt: 'created_at',
    updatedAt: 'created_at'
  },
  blog_posts: {
    title: 'subject',
    body: 'body',
    publishedVersion: 1
  },
  diary: {
    body: 'body'
  }
}

async function importModel (model, spaceId, fromHeaders, headers) {
  let hasData = true
  let page = 1
  const result = {counts: {success: 0, error: 0}}
  while (hasData) {
    const fromDocs = await getDocs(model, fromHeaders, page)
    const docs = fromDocs.map(doc => mapDoc(doc.attributes, model, mappings))
    hasData = docs.length > 0
    if (hasData) {
      const data = await importDocs(model, docs, spaceId, headers)
      const errors = data.results.filter(result => result.error)
      console.log(`${model.coll} import errors: ${prettyJson(errors)}`)
      result.counts.success += data.counts.success
      result.counts.error += data.counts.error
    }
    page += 1
  }
  return result
}

async function main () {
  const {headers: fromHeaders} = await fromLogin()
  const credentials = {email: config('EMAIL'), password: config('PASSWORD')}
  await createUser(credentials)
  const {headers} = await login(credentials)
  const account = {name: config('ACCOUNT_NAME')}
  const {id: accountId} = await createAccount(account, headers)

  const {id: spaceId} = await createSpace(accountId, headers)
  await createModel(spaceId, headers, BlogPost)
  await createModel(spaceId, headers, Diary)

  const result = {}
  const models = [BlogPost, Diary]
  for (let model of models) {
    result[model.coll] = await importModel(model, spaceId, fromHeaders, headers)
  }
  const totalErrors = Object.values(result).map(r => r.counts.error).reduce((sum, e) => sum + e)
  console.log(`result: ${prettyJson(result)}`)
  console.log(`totalErrors: ${totalErrors}`)
}

main()
