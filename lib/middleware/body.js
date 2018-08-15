const assert = require('assert')

function bodyParser (req, res, next) {
  if (req.method === 'POST' || req.method === 'PUT') {
    const data = []
    req.on('data', chunk => {
      data.push(chunk)
    })
    req.on('end', () => {
      try {
        if (data.length > 0) {
          const bodyString = Buffer.concat(data).toString()
          const body = JSON.parse(bodyString)
          assert((typeof body === 'object'), 'JSON body must be an object')
          req.params = Object.assign((req.params || {}), body)
          req.bodyParams = body
        }
        next()
      } catch (e) {
        const status = 400
        const errors = [{type: 'invalid_json_body', message: e.message}]
        next({status, errors})
      }
    })
  } else {
    next()
  }
}

module.exports = {
  bodyParser
}
