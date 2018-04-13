const {pick} = require('lib/util')
const config = require('app/config')
const {jsonResponse} = config.modules.response
const swagger = require('app/swagger')

async function index (req, res) {
  const body = await swagger(pick(req.params, ['spaceId']))
  jsonResponse(req, res, body)
}

module.exports = {
  index
}
