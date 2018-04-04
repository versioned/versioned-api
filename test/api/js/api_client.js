const {keyValues, json} = require('lib/util')
const axios = require('axios').create({validateStatus: (status) => status < 500})
const _assert = require('assert')
const {uuid} = require('lib/util')

function isMongoId (id) {
  return id && id.match(/[a-z0-9]{24}/)
}

function dataString (data) {
  if (!data) return ''
  return keyValues(data).map(([key, value]) => {
    return `${key}:='${json(value)}'`
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

  async function get (expect, path, options = {}) {
    printExpect(expect)
    const url = `${BASE_URL}${path}`
    console.log(`http get '${url}' ${headerString(options.headers)}`)
    const result = await axios.get(url, options)
    self.requests.push({method: 'GET', path, options, result, suite: self.suite})
    assertEqual(result.status, expect.status || 200)
    return result
  }

  async function post (expect, path, data, options = {}) {
    printExpect(expect)
    const url = `${BASE_URL}${path}`
    console.log(`http post '${url}' ${dataString(data)} ${headerString(options.headers)}`)
    const result = await axios.post(url, data, options)
    self.requests.push({method: 'POST', path, data, options, result, suite: self.suite})
    assertEqual(result.status, expect.status || 200)
    return result
  }

  async function put (expect, path, data, options = {}) {
    printExpect(expect)
    const url = `${BASE_URL}${path}`
    console.log(`http put '${url}' ${dataString(data)} ${headerString(options.headers)}`)
    const result = await axios.put(url, data, options)
    self.requests.push({method: 'PUT', path, data, options, result, suite: self.suite})
    assertEqual(result.status, expect.status || 200)
    return result
  }

  async function _delete (expect, path, options = {}) {
    printExpect(expect)
    const url = `${BASE_URL}${path}`
    console.log(`http delete '${url}' ${headerString(options.headers)}`)
    const result = await axios.delete(url, options)
    self.requests.push({method: 'DELETE', path, options, result, suite: self.suite})
    assertEqual(result.status, expect.status || 200)
    return result
  }

  Object.assign(self, {
    assert,
    assertEqual,
    isMongoId,
    uuid,
    get,
    post,
    put,
    delete: _delete
  })
  return self
}

module.exports = client
