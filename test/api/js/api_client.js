const fs = require('fs')
const path = require('path')
const {keyValues, json, prettyJson} = require('lib/util')
const axios = require('axios').create({validateStatus: (status) => status < 500})
const _assert = require('assert')
const {uuid, pick, merge, array} = require('lib/util')
const {isMongoId} = require('lib/mongo')

function unwrapData (result) {
  if (!result.data) return result
  return merge(result, {
    data: result.data.data
  })
}

function make (attributes) {
  const id = uuid()
  return attributes.reduce((acc, item) => {
    const [key, make] = array(item)
    acc[key] = (make ? make(id) : id)
    return acc
  }, {})
}

function makeUser () {
  return make([
    'name',
    ['email', (id) => `${id}@example.com`],
    'password'])
}

function dataString (data) {
  if (!data) return ''
  return keyValues(data).map(([key, value]) => {
    if (typeof value === 'string') {
      return `${key}='${value}'`
    } else {
      return `${key}:='${json(value)}'`
    }
  }).join(' ')
}

function headerString (headers) {
  if (!headers) return ''
  return keyValues(headers).map(([key, value]) => {
    return `${key}:'${value}'`
  }).join(' ')
}

function expectName (expect) {
  return typeof expect === 'string' ? expect : expect.it
}

function printExpect (expect) {
  const heading = expectName(expect)
  if (heading) console.log(`\n### ${heading}`)
}

function printHttp (method, url, headers, data) {
  if (typeof data === 'string') {
    console.log(`echo '${data}' | http ${method} '${url}' ${headerString(headers)}`)
  } else {
    console.log(`http ${method} '${url}' ${dataString(data)} ${headerString(headers)}`)
  }
}

function client ({BASE_URL}) {
  const self = {
    data: {},
    defaultOptions: null,
    suite: null,
    requests: []
  }

  function logRequests () {
    const logPath = path.join(__dirname, '/log.json')
    fs.writeFileSync(logPath, prettyJson(self.requests))
    console.log(`Requests writted to ${logPath}`)
  }

  function printLastResult () {
    const response = self.requests[self.requests.length - 1].response
    console.log(`Last API response status=${response.status}`)
    console.log(json(response.data))
  }

  function assertEqual (actual, expected) {
    try {
      _assert.deepEqual(actual, expected)
    } catch (err) {
      console.log('assertEqual failed')
      console.log(`actual='${json(actual)}'`)
      console.log(`expected='${json(expected)}'`)
      printLastResult()
      logRequests()
      throw err
    }
  }

  function assert (actual) {
    try {
      _assert(actual)
    } catch (err) {
      console.log('assert failed')
      console.log(`actual='${json(actual)}'`)
      printLastResult()
      logRequests()
      throw err
    }
  }

  async function login (user) {
    let result = await post('log in', `/login`, pick(user, ['email', 'password']))
    return {authorization: `Bearer ${result.data.token}`}
  }

  async function registerUser (user) {
    user = user || makeUser()
    let result = await post('create user', `/users`, user)
    user = merge(user, pick(result.data, ['id', '_id']))
    const headers = await login(user)
    return {user, headers}
  }

  async function get (expect, path, options = {}) {
    options = merge(self.defaultOptions, options)
    printExpect(expect)
    const url = `${BASE_URL}${path}`
    printHttp('get', url, options.headers)
    const result = await axios.get(url, options)
    self.requests.push({
      suite: self.suite,
      it: expectName(expect),
      request: {method: 'GET', url, options},
      response: pick(result, ['status', 'headers', 'data'])
    })
    assertEqual(result.status, expect.status || 200)
    return unwrapData(result)
  }

  async function post (expect, path, data, options = {}) {
    options = merge(self.defaultOptions, options)
    printExpect(expect)
    const url = `${BASE_URL}${path}`
    printHttp('post', url, options.headers, data)
    const result = await axios.post(url, data, options)
    self.requests.push({
      suite: self.suite,
      it: expectName(expect),
      request: {method: 'POST', url, options},
      response: pick(result, ['status', 'headers', 'data'])
    })
    assertEqual(result.status, expect.status || 200)
    return unwrapData(result)
  }

  async function put (expect, path, data, options = {}) {
    options = merge(self.defaultOptions, options)
    printExpect(expect)
    const url = `${BASE_URL}${path}`
    printHttp('put', url, options.headers, data)
    const result = await axios.put(url, data, options)
    self.requests.push({
      suite: self.suite,
      it: expectName(expect),
      request: {method: 'PUT', url, options},
      response: pick(result, ['status', 'headers', 'data'])
    })
    assertEqual(result.status, expect.status || 200)
    return unwrapData(result)
  }

  async function _delete (expect, path, options = {}) {
    options = merge(self.defaultOptions, options)
    printExpect(expect)
    const url = `${BASE_URL}${path}`
    printHttp('delete', url, options.headers)
    const result = await axios.delete(url, options)
    self.requests.push({
      suite: self.suite,
      it: expectName(expect),
      request: {method: 'DELETE', url, options},
      response: pick(result, ['status', 'headers', 'data'])
    })
    assertEqual(result.status, expect.status || 200)
    return unwrapData(result)
  }

  Object.assign(self, {
    logRequests,
    assert,
    assertEqual,
    isMongoId,
    uuid,
    makeUser,
    registerUser,
    login,
    get,
    post,
    put,
    delete: _delete
  })
  return self
}

module.exports = client
