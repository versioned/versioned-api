const {last} = require('lib/util')
const parseUrl = require('url').parse
const parseQuery = require('querystring').parse
const {extractUrls} = require('app/models/emails')
const users = require('app/models/users')

module.exports = async function (c) {
  const credentials = {
    email: `verify-user-${c.uuid()}@example.com`,
    password: 'foobar'
  }
  let result = await c.post('create user', '/users', credentials)
  const user = result.data

  result = await c.get('list emails and check first one', `/emails`, {headers: c.data.superHeaders})
  const email = result.data[0]
  const trackedUrl = extractUrls(email.body)[0]
  const url = parseUrl(decodeURIComponent(last(trackedUrl.split('/'))))
  const verifyEmailToken = parseQuery(url.query).token

  await c.post('verify email', '/verify-email', {email: credentials.email, token: verifyEmailToken})

  const userAfter = await users.get(user.id, {allowMissing: false})
  console.log('pm debug userAfter', userAfter)
  c.assert(userAfter.emailVerified)
  c.assert(!userAfter.verifyEmailToken)
}
