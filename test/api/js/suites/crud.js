const axios = require('axios')
const {uuid, keys, set} = require('lib/util')
const assert = require('assert')

function isMongoId (id) {
  return id && id.match(/[a-z0-9]{24}/)
}

module.exports = async function ({BASE_URL}) {
  const name = uuid()
  const space = {
    name
  }
  let result = await axios.post(`${BASE_URL}/spaces`, space)
  assert.equal(result.status, 200)
  assert.deepEqual(set(keys(result.data)), set(['_id', 'name']))
  assert.equal(result.data.name, name)
  const _id = result.data._id
  assert(isMongoId(_id))

  result = await axios.get(`${BASE_URL}/spaces`)
  assert.equal(result.status, 200)
  assert.deepEqual(result.data[0], {_id, name})
  // TODO: need sort by id/created_at desc for this
}
