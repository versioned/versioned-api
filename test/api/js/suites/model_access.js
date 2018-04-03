const axios = require('axios')
const {uuid} = require('lib/util')
const assert = require('assert')
const {elapsedSeconds} = require('lib/date_util')

module.exports = async function ({BASE_URL}) {
  const name = uuid()
  const user = {
    name,
    email: `${name}@example.com`,
    password: 'admin'
  }
  let result = await axios.post(`${BASE_URL}/users`, user)
  assert.equal(result.status, 200)
  assert(!result.data.password)
  assert(!result.data.password_hash)
  const createdAt = result.data.created_at
  const id = result.data.id
  assert(id)
  assert(elapsedSeconds(createdAt) < 1)

  result = await axios.post(`${BASE_URL}/login`, user)
  assert.equal(result.status, 200)
  const headers = {authorization: `Bearer ${result.data.token}`}

  result = await axios.put(`${BASE_URL}/users/${id}`, {created_at: new Date()}, {headers})
  assert.equal(result.status, 200)

  result = await axios.get(`${BASE_URL}/users/${id}`, {headers})
  assert.equal(result.status, 200)
  assert.equal(result.data.created_at, createdAt)
  assert(!result.data.password)
  assert(!result.data.password_hash)
}
