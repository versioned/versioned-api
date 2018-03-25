const users = require('app/models/users')
const logger = require('app/config').logger

function create(req, res) {
  const doc = req.params
  users.create(doc).then(user => {
      res.writeHead(200, {'Content-Type': 'application/json'})
      res.end(JSON.stringify(user))
    })
    .catch(error => {
      res.writeHead(422, {'Content-Type': 'application/json'})
      res.end(JSON.stringify(error))
    })
}

module.exports = {
  create
}
