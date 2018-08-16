const {elapsedSeconds} = require('lib/date_util')
const emails = require('app/models/emails')

module.exports = async function (c) {
  await c.get({it: 'GET email_link where email doesnt exist', status: 404}, `/email_link/foo/bar`, c.anonymous)
  let email = await emails.create({
    from: 'foo@example.com',
    to: c.data.user.email,
    subject: 'awesome email',
    body: 'awesome body'
  })
  const url = 'https://app.versioned.io/#/some/path?foo=1&bar=2'
  await c.get('GET email_link where email exists', `/email_link/${email.id}/${encodeURIComponent(url)}`, c.anonymous)
  email = await emails.get(email.id, {allowMissing: false})
  c.assertEqual(email.linkClicks.length, 1)
  let click = email.linkClicks[0]
  c.assert(elapsedSeconds(click.clickedAt) < 2)
  c.assertEqual(click.url, url)

  await c.get('GET email_link where email exists again', `/email_link/${email.id}/${encodeURIComponent(url)}`, c.anonymous)
  email = await emails.get(email.id, {allowMissing: false})
  c.assertEqual(email.linkClicks.length, 2)
  click = email.linkClicks[1]
  c.assert(elapsedSeconds(click.clickedAt) < 2)
  c.assertEqual(click.url, url)
}
