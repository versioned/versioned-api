const {last} = require('lib/util')
const parseUrl = require('url').parse
const parseQuery = require('querystring').parse
const {extractUrls} = require('app/models/emails')

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

  result = await c.get('get user and check verified', `/users/${user.id}`, {headers: c.data.superHeaders})
  c.assert(result.data.emailVerified)
  c.assert(!result.data.verifyEmailToken)
}
