const {jsonResponse} = require('lib/response')
const swagger = require('app/swagger')

async function index (req, res) {
  const body = await swagger()
  jsonResponse(res, body)
}

module.exports = {
  index
}
