const users = require('app/models/users')
const {response} = require('app/config').modules
const {jsonResponse} = response

async function login (req, res) {
  const {email, password, getUser} = req.params
  const data = await users.login(email, password, {getUser})
  if (data) {
    jsonResponse(req, res, {data})
  } else {
    res.writeHead(401, {'Content-Type': 'application/json'})
    res.end()
  }
}

module.exports = {
  login
}
