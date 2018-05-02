const {compact, json} = require('lib/util')
const users = require('app/models/users')
const {logger, response} = require('app/config').modules
const {jsonResponse} = response
const {readableDoc} = require('lib/model_access')
const accounts = require('app/models/accounts')
const spaces = require('app/models/spaces')

async function login (req, res) {
  const {email, password} = req.params
  const user = await users.get({email})
  const success = await users.authenticate(user, password)
  if (success) {
    logger.debug(`controllers.login - auth successful email=${email}`)
    const token = users.generateToken(user)
    const {account, space} = await users.getDefaultAccountAndSpace(user)
    jsonResponse(req, res, compact({data: {
      user: readableDoc(users.model, user),
      token,
      account: readableDoc(accounts.model, account),
      space: readableDoc(spaces.model, space)
    }}))
  } else {
    logger.debug(`controllers.login - auth failed email=${email} password=${password} user=${json(user)}`)
    res.writeHead(401, {'Content-Type': 'application/json'})
    res.end()
  }
}

module.exports = {
  login
}
