const {pick} = require('lib/util')
const config = require('app/config')
const {jsonResponse} = config.modules.response
const swagger = require('app/swagger')

async function index (req, res) {
  const options = pick(req.params, ['spaceId'])
  const body = await swagger(options)
  jsonResponse(req, res, body)
}

module.exports = {
  index
}
