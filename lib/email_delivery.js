const sgMail = require('@sendgrid/mail')

// See: https://github.com/sendgrid/sendgrid-nodejs/tree/master/packages/mail
function emailDelivery (config) {
  const enabled = (config.SENDGRID_API_KEY && config.NODE_ENV === 'production')
  if (enabled) sgMail.setApiKey(config.SENDGRID_API_KEY)
  function send (args) {
    if (!enabled) return {message: 'Email not enabled'}
    return sgMail.deliver(args)
  }

  return {
    send
  }
}

module.exports = emailDelivery
