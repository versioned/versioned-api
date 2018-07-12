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
      error: {type: 'string'}
    },
    required: ['to', 'from', 'subject', 'body'],
    additionalProperties: false
  },
  routes: {
    list: {superUser: true}
  }
}

const api = modelApi(model, mongo, logger)

async function deliver ({to, subject, body}) {
  const from = config.FROM_EMAIL
  subject = `[${config.TITLE}] ${subject}`
  let result = null
  let error = null
  try {
    result = await emailDelivery(config).send({from, to, subject, text: body})
  } catch (e) {
    error = e.toString()
  }
  await api.create({from, to, subject, body, error})
  return error ? {error} : result
}

module.exports = Object.assign(api, {
  deliver
})
