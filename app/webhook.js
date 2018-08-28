const axios = require('axios')
const config = require('app/config')
const {getIn} = require('lib/util')
const {logger} = config.modules
const {elapsed} = require('lib/date_util')

const TIMEOUT = 10000

async function invoke (url, data, options = {}) {
  try {
    const startTime = new Date()
    const response = await axios.post(url, {data}, {timeout: TIMEOUT})
    logger.debug(`webhook.invoke url=${url} spaceId=${getIn(options, 'space.id')} elapsed=${elapsed(startTime)} status=${getIn(response, 'status')}`)
  } catch (error) {
    if (options.catchError === false) throw error
    logger.error(`webhook.invoke error for url=${url} ${error.message}`, error)
    if (config.BUGSNAG_API_KEY) {
      const bugsnag = require('bugsnag')
      bugsnag.notify(error)
    }
    // TODO: email?
  }
}

module.exports = {
  invoke
}
