const home = require('app/controllers/home')
const auth = require('app/controllers/auth')
const users = require('app/controllers/users')
const groupByMethod = require('lib/router').groupByMethod

const routes = [
  {
    method: 'get',
    path: '/',
    handler: home.index
  },
  {
    method: 'post',
    path: '/v1/login',
    handler: auth.login
  },
  {
    method: 'post',
    path: '/v1/users',
    handler: users.create
  }
]

module.exports = groupByMethod(routes)
