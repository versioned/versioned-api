const home = require('app/controllers/home')
const groupByMethod = require('lib/router').groupByMethod

const routes = [
  {
    method: 'get',
    path: '/',
    handler: home.index
  },
]

module.exports = groupByMethod(routes)
