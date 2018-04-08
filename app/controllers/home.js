const {prettyJson} = require('lib/util')

async function index (req, res) {
  res.writeHead(200, {'Content-Type': 'application/json'})
  res.end(prettyJson(await require('app/routes').getRoutes()))
}

module.exports = {
  index
}
