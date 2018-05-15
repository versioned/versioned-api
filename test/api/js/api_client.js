const fs = require('fs')
const path = require('path')
const {isArray, uuid, pick, merge, array, empty, keyValues, json, prettyJson} = require('lib/util')
const axios = require('axios').create({validateStatus: (status) => status < 500})
const _assert = require('assert')
const config = require('app/config')
const {isMongoId} = config.modules.mongo
const {elapsedSeconds} = require('lib/date_util')
const querystring = require('querystring')

const anonymous = {headers: {authorization: null}}

function unwrapData (result) {
  if (!result.data) return result
  return merge(result, {
    data: result.data.data,
    body: result.data
  })
}

function make (attributesList) {
  const id = uuid()
  return attributesList.reduce((acc, item) => {
    const [key, make] = array(item)
    acc[key] = (make ? make(id) : id)
    return acc
  }, {})
}

function makeUser (attributes = {}) {
  return merge(make([
    'name',
    ['email', (id) => `${id}@example.com`],
    'password']), attributes)
}

function makeAccount (attributes = {}) {
  return merge(make(['name']), attributes)
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

function printSection (name) {
  console.log('\n--------------------------------------')
  console.log(name)
  console.log('--------------------------------------')
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

// NOTE: We use this for mongodb collection names which should not start with a digit
function uuidWithLetter (length) {
  return 'u' + uuid(length)
}

function urlWithParams (url, params) {
  if (empty(params)) return url
  const sep = url.includes('?') ? '&' : '?'
  return url + sep + querystring.stringify(params)
}

function client ({BASE_URL, DEDICATED_MONGODB_URL}) {
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
    if (process.env.PRINT_REQUESTS) console.log(prettyJson(self.requests))
  }

  function printLastResult () {
    const response = self.requests[self.requests.length - 1].response
    console.log(`Last API response status=${response.status}`)
    console.log(prettyJson(response.data))
  }

  function assertEqual (actual, expected, msg) {
    try {
      _assert.deepStrictEqual(actual, expected, msg)
    } catch (err) {
      console.log('assertEqual failed')
      console.log(`actual='${json(actual)}'`)
      console.log(`expected='${json(expected)}'`)
      printLastResult()
      logRequests()
      throw err
    }
  }

  function assertEqualKeys (keys, actual, expected, msg) {
    const pickKeys = (v) => pick(v, keys)
    if (isArray(expected)) {
      assertEqual(actual.map(pickKeys), expected.map(pickKeys), msg)
    } else {
      assertEqual(pickKeys(actual), pickKeys(expected), msg)
    }
  }

  function assert (actual, msg) {
    try {
      _assert(actual, msg)
    } catch (err) {
      console.log('assert failed')
      console.log(`actual='${json(actual)}'`)
      printLastResult()
      logRequests()
      throw err
    }
  }

  function assertRecent (actual, msg) {
    assert(actual && elapsedSeconds(actual) < 1, msg)
  }

  async function login (user) {
    let result = await post('log in', `/login`, pick(user, ['email', 'password']))
    return {authorization: `Bearer ${result.data.token}`}
  }

  async function registerUser (options = {}) {
    const user = options.user || makeUser()
    const accountAttributes = options.account || makeAccount()
    let result = await post('create user', `/users`, user)
    user.id = result.data.id
    const headers = await login(user)
    const account = (await post('create account', '/accounts', accountAttributes, {headers})).data
    return {account, user, headers}
  }

  async function get (expect, path, options = {}) {
    options = merge(self.defaultOptions, options)
    printExpect(expect)
    let url = `${BASE_URL}${path}`
    printHttp('get', urlWithParams(url, options.params), options.headers)
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
      request: {method: 'POST', url, data, options},
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
      request: {method: 'PUT', url, data, options},
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
    DEDICATED_MONGODB_URL,
    prettyJson,
    printSection,
    printLastResult,
    anonymous,
    logRequests,
    assert,
    assertRecent,
    assertEqual,
    assertEqualKeys,
    isMongoId,
    uuid: uuidWithLetter,
    makeUser,
    makeAccount,
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
