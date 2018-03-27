const axios = require('axios')
const {uuid} = require('lib/util')
const assert = require('assert')

module.exports = async function ({BASE_URL}) {
  const name = uuid()
  const user = {
    name,
    email: `${name}@example.com`,
    password: 'admin'
  }
  const result = await axios.post(`${BASE_URL}/users`, user)
  assert.equal(result.status, 200)
  console.log(result.data)
}
