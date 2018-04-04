const {keyValues, json} = require('lib/util')
const axios = require('axios').create({validateStatus: (status) => status < 500})
const _assert = require('assert')
const {uuid} = require('lib/util')

function assertEqual (actual, expect) {
  _assert.deepEqual(actual, expect)
}

function assert (actual) {
  _assert(actual)
}

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
  const requests = []

  async function get (expect, path, options = {}) {
    printExpect(expect)
    const url = `${BASE_URL}${path}`
    console.log(`http get '${url}' ${headerString(options.headers)}`)
    const result = await axios.get(url, options)
    requests.push({method: 'GET', path, options, result})
    assertEqual(result.status, expect.status || 200)
    return result
  }

  async function post (expect, path, data, options = {}) {
    printExpect(expect)
    const url = `${BASE_URL}${path}`
    console.log(`http post '${url}' ${dataString(data)} ${headerString(options.headers)}`)
    const result = await axios.post(url, data, options)
    requests.push({method: 'POST', path, data, options, result})
    assertEqual(result.status, expect.status || 200)
    return result
  }

  async function put (expect, path, data, options = {}) {
    printExpect(expect)
    const url = `${BASE_URL}${path}`
    console.log(`http put '${url}' ${dataString(data)} ${headerString(options.headers)}`)
    const result = await axios.put(url, data, options)
    requests.push({method: 'PUT', path, data, options, result})
    assertEqual(result.status, expect.status || 200)
    return result
  }

  async function _delete (expect, path, options = {}) {
    printExpect(expect)
    const url = `${BASE_URL}${path}`
    console.log(`http delete '${url}' ${headerString(options.headers)}`)
    const result = await axios.delete(url, options)
    requests.push({method: 'DELETE', path, options, result})
    assertEqual(result.status, expect.status || 200)
    return result
  }

  return {
    assert,
    assertEqual,
    isMongoId,
    uuid,
    get,
    post,
    put,
    delete: _delete
  }
}

module.exports = client
