const {pick, nth, json} = require('lib/util')
const modelApi = require('lib/model_api')
const config = require('app/config')
const {logger, mongo} = config.modules
const emailDelivery = require('lib/email_delivery')

const model = {
  type: 'emails',
  schema: {
    type: 'object',
    properties: {
      to: {type: 'string'},
      from: {type: 'string'},
      subject: {type: 'string'},
      body: {type: 'string'},
      error: {type: 'string'},
      result: {type: 'object'}
    },
    required: ['to', 'from', 'subject', 'body'],
    additionalProperties: false
  },
  routes: {
    list: {superUser: true}
  }
}

const api = modelApi(model, mongo, logger)

async function deliver ({from, to, bcc, subject, body}) {
  from = from || config.FROM_EMAIL
  subject = `[${config.EMAIL_PREFIX}] ${subject}`
  let result = null
  let error = null
  try {
    result = await emailDelivery(config).send({from, to, bcc, subject, text: body})
  } catch (e) {
    error = e.toString()
  }
  const saveResult = result && pick(nth(result, 0), ['statusCode', 'statusMessage'])
  logger.debug(`emails.deliver to=${to} subject="${subject}" error=${error} saveResult=${json(saveResult)}`)
  await api.create({from, to, subject, body, error, result: saveResult})
  return error ? {error} : result
}

module.exports = Object.assign(api, {
  deliver
})
