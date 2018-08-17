const {last, pick, nth, json} = require('lib/util')
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
      result: {type: 'object'},
      linkClicks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            url: {type: 'string'},
            clickedAt: {type: 'string', format: 'date-time'}
          }
        }
      }
    },
    required: ['to', 'from', 'subject', 'body'],
    additionalProperties: false
  },
  routes: {
    list: {superUser: true}
  }
}

const api = modelApi(model, mongo, logger)

const URL_PATTERN = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}(?:\.[a-z]{2,4})?\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g

function trackedUrl (id, url) {
  return `${config.API_BASE_URL}/email_link/${id}/${encodeURIComponent(url)}`
}

function makeUrlsTracked (id, body) {
  return body.replace(URL_PATTERN, url => trackedUrl(id, url))
}

function extractUrls (body) {
  return body.match(URL_PATTERN).map(trackedUrl => {
    return decodeURIComponent(last(trackedUrl.split('/')))
  })
}

async function emailIsVerified (email) {
  const count = await api.count({to: email, linkClicks: {$exists: true}})
  return count > 0
}

async function deliver ({from, to, bcc, subject, body}) {
  const id = mongo.createId()
  from = from || config.FROM_EMAIL
  subject = `[${config.EMAIL_PREFIX}] ${subject}`
  body = makeUrlsTracked(id, body)
  let result = null
  let error = null
  try {
    result = await emailDelivery(config).send({from, to, bcc, subject, text: body})
  } catch (e) {
    error = e.toString()
  }
  const saveResult = result && pick(nth(result, 0), ['statusCode', 'statusMessage'])
  logger.debug(`emails.deliver to=${to} subject="${subject}" error=${error} saveResult=${json(saveResult)}`)
  await api.create({id, from, to, subject, body, error, result: saveResult})
  return error ? {error} : result
}

module.exports = Object.assign(api, {
  trackedUrl,
  deliver,
  extractUrls,
  emailIsVerified
})
