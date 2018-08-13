const {merge} = require('lib/util')

const DEFAULT_PLAN = 'professional'

const free = {
  DATA_LIMIT: 500,
  USERS_LIMIT: 1
}

const professional = merge(free, {
  DATA_LIMIT: 1000,
  USERS_LIMIT: 10
})

const PLANS = {
  free,
  professional
}

module.exports = {
  DEFAULT_PLAN,
  PLANS
}
