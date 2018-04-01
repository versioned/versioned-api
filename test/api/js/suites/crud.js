const axios = require('axios').create({validateStatus: (status) => status < 500})
const {uuid} = require('lib/util')
const assert = require('assert')

function isMongoId (id) {
  return id && id.match(/[a-z0-9]{24}/)
}

module.exports = async function ({BASE_URL}) {
  const name = uuid()
  const user = {
    name,
    email: `${name}@example.com`,
    password: 'admin'
  }
  let result = await axios.post(`${BASE_URL}/users`, user)
  assert.equal(result.status, 200)
  assert.equal(result.data.name, name)
  assert.equal(result.data.email, user.email)
  assert(isMongoId(result.data._id))
  const id = result.data.id

  result = await axios.get(`${BASE_URL}/users/${id}`)
  assert.equal(result.status, 401)

  result = await axios.post(`${BASE_URL}/login`, user)
  assert.equal(result.status, 200)
  const headers = {authorization: `Bearer ${result.data.token}`}

  result = await axios.get(`${BASE_URL}/users/${id}`, {headers})
  assert.equal(result.status, 200)
  assert.equal(result.data.name, user.name)
  assert.equal(result.data.email, user.email)

  result = await axios.get(`${BASE_URL}/users`)
  assert.equal(result.status, 401)

  result = await axios.get(`${BASE_URL}/users`, {headers})
  assert.equal(result.status, 200)
  assert.deepEqual(result.data[0].id, id)
  assert.deepEqual(result.data[0].email, user.email)

  result = await axios.put(`${BASE_URL}/users/${id}`, {name: 'changed name'})
  assert.equal(result.status, 401)

  result = await axios.put(`${BASE_URL}/users/${id}`, {name: 'changed name'}, {headers})
  assert.equal(result.status, 200)

  result = await axios.get(`${BASE_URL}/users/${id}`, {headers})
  assert.equal(result.status, 200)
  assert.equal(result.data.name, 'changed name')
  assert.equal(result.data.email, user.email)

  result = await axios.delete(`${BASE_URL}/users/${id}`)
  assert.equal(result.status, 401)

  result = await axios.delete(`${BASE_URL}/users/${id}`, {headers})
  assert.equal(result.status, 200)

  result = await axios.get(`${BASE_URL}/users/${id}`, {headers})
  assert.equal(result.status, 401)

  const adminUser = {
    name,
    email: `${uuid()}@example.com`,
    password: 'admin'
  }
  result = await axios.post(`${BASE_URL}/users`, adminUser)
  assert.equal(result.status, 200)

  result = await axios.post(`${BASE_URL}/login`, adminUser)
  assert.equal(result.status, 200)
  const adminHeaders = {authorization: `Bearer ${result.data.token}`}

  result = await axios.get(`${BASE_URL}/users/${id}`, {headers: adminHeaders})
  assert.equal(result.status, 404)
}
