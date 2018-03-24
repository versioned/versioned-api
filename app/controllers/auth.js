const users = require('app/models/users')
const logger = require('app/config').logger

async function login(req, res) {
  const {email, password} = req.params
  const user = await users.findOne({email})
  const success = await users.authenticate(user, password)
  if (success) {
    logger.debug(`controllers.login - auth successful email=${email}`)
    const token = users.generateToken(user)
    res.writeHead(200, {'Content-Type': 'application/json'})
    res.end(JSON.stringify({user, token}))
  } else {
    logger.debug(`controllers.login - auth failed email=${email} password=${password} user=${user}`)
    res.writeHead(401, {'Content-Type': 'application/json'})
    res.end('')
  }
}

module.exports = {
  login
}
