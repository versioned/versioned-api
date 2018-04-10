const {prettyJson} = require('lib/util')

async function dbStats (req, res) {
  res.writeHead(200, {'Content-Type': 'application/json'})
  res.end(prettyJson(await require('lib/mongo').dbStats()))
}

module.exports = {
  dbStats
}
