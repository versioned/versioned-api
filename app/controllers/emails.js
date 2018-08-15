const emails = require('app/models/emails')
const {response} = require('app/config').modules
const {redirect, errorResponse} = response

async function emailLink (req, res) {
  try {
    const email = await emails.get(req.params.id, {allowMissing: false})
    const click = {url: req.params.url, clickedAt: new Date()}
    const linkClicks = (email.linkClicks || []).concat([click])
    await emails.update(email.id, {linkClicks})
    redirect(res, req.params.url)
  } catch (error) {
    errorResponse(req, res, error, 'Could not follow email link')
  }
}

module.exports = {
  emailLink
}
