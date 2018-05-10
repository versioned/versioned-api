const {json} = require('lib/util')
const users = require('app/models/users')
const {logger, response} = require('app/config').modules
const {jsonResponse} = response

async function login (req, res) {
  const {email, password, getUser} = req.params
  const relationships = getUser ? 2 : 1
  const user = await users.get({email}, {queryParams: {relationships}})
  const success = await users.authenticate(user, password)
  if (success) {
    logger.debug(`controllers.login - auth successful email=${email}`)
    const token = users.generateToken(user)
    const data = {token}
    if (getUser) data.user = user
    jsonResponse(req, res, {data})
  } else {
    logger.debug(`controllers.login - auth failed email=${email} password=${password} user=${json(user)}`)
    res.writeHead(401, {'Content-Type': 'application/json'})
    res.end()
  }
}

module.exports = {
  login
}
