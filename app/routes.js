const home = require('app/controllers/home')
const auth = require('app/controllers/auth')
const groupByMethod = require('lib/router').groupByMethod

const routes = [
  {
    method: 'get',
    path: '/',
    handler: home.index
  },
  {
    method: 'post',
    path: '/login',
    handler: auth.login
  },
]

module.exports = groupByMethod(routes)
