const {merge} = require('lib/util')

const DEFAULT_PLAN = 'professional'

const free = {
  DATA_LIMIT: 500,
  USERS_LIMIT: 1
}

const professional = merge(free, {
  DATA_LIMIT: 2000,
  USERS_LIMIT: 10
})

const enterprise = merge(free, {
  DATA_LIMIT: 1000000,
  USERS_LIMIT: 100
})

const PLANS = {
  free,
  professional,
  enterprise
}

module.exports = {
  DEFAULT_PLAN,
  PLANS
}
