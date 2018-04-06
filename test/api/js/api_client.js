const {keyValues, json} = require('lib/util')
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

function printExpect (expect) {
  const heading = (typeof expect === 'string' ? expect : expect.it)
  if (heading) console.log(`\n### ${heading}`)
}

function client ({BASE_URL}) {
  const self = {
    suite: null,
    requests: []
  }

  function printLastResult () {
    const result = self.requests[self.requests.length - 1].result
    console.log(`Last API response status=${result.status}`)
    console.log(json(result.data))
  }

  function assertEqual (actual, expected) {
    try {
      _assert.deepEqual(actual, expected)
    } catch (err) {
      console.log('assertEqual failed')
      console.log(`actual='${json(actual)}'`)
      console.log(`expected='${json(expected)}'`)
      printLastResult()
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
    printExpect(expect)
    const url = `${BASE_URL}${path}`
    console.log(`http get '${url}' ${headerString(options.headers)}`)
    const result = await axios.get(url, options)
    self.requests.push({method: 'GET', path, options, result, suite: self.suite})
    assertEqual(result.status, expect.status || 200)
    return unwrapData(result)
  }

  async function post (expect, path, data, options = {}) {
    printExpect(expect)
    const url = `${BASE_URL}${path}`
    console.log(`http post '${url}' ${dataString(data)} ${headerString(options.headers)}`)
    const result = await axios.post(url, data, options)
    self.requests.push({method: 'POST', path, data, options, result, suite: self.suite})
    assertEqual(result.status, expect.status || 200)
    return unwrapData(result)
  }

  async function put (expect, path, data, options = {}) {
    printExpect(expect)
    const url = `${BASE_URL}${path}`
    console.log(`http put '${url}' ${dataString(data)} ${headerString(options.headers)}`)
    const result = await axios.put(url, data, options)
    self.requests.push({method: 'PUT', path, data, options, result, suite: self.suite})
    assertEqual(result.status, expect.status || 200)
    return unwrapData(result)
  }

  async function _delete (expect, path, options = {}) {
    printExpect(expect)
    const url = `${BASE_URL}${path}`
    console.log(`http delete '${url}' ${headerString(options.headers)}`)
    const result = await axios.delete(url, options)
    self.requests.push({method: 'DELETE', path, options, result, suite: self.suite})
    assertEqual(result.status, expect.status || 200)
    return unwrapData(result)
  }

  Object.assign(self, {
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
