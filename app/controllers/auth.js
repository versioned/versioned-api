const users = require('app/models/users')
const {response} = require('app/config').modules
const {jsonResponse, errorResponse} = response
const assert = require('assert')

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

async function verifyEmail (req, res) {
  const {email, token} = req.params
  try {
    const data = await users.verifyEmail(email, token)
    jsonResponse(req, res, {data})
  } catch (error) {
    errorResponse(req, res, error, 'Could not verify email')
  }
}

async function forgotPasswordDeliver (req, res) {
  const {email} = req.params
  try {
    const user = await users.get({email}, {allowMissing: false})
    const data = await users.forgotPasswordDeliver(user)
    jsonResponse(req, res, {data})
  } catch (error) {
    errorResponse(req, res, error, 'Could not deliver forgotten password email')
  }
}

async function forgotPasswordChange (req, res) {
  const {email, token, password} = req.params
  try {
    const user = await users.get({email, forgotPasswordToken: token}, {allowMissing: false})
    assert.equal(user.forgotPasswordToken, token, 'forgotPasswordToken must match')
    const data = await users.forgotPasswordChange(user, password)
    jsonResponse(req, res, {data})
  } catch (error) {
    errorResponse(req, res, error, 'Could not change password')
  }
}

module.exports = {
  login,
  verifyEmail,
  forgotPasswordDeliver,
  forgotPasswordChange
}
