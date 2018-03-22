const assert = require('assert')

function bodyParser(req, res, next) {
  if (req.method === 'POST' || req.method === 'PUT') {
    const data = []
    req.on('data', function(chunk) {
      data.push(chunk)
    })
    req.on('end', function() {
      try {
        const bodyString = Buffer.concat(data).toString()
        const body = JSON.parse(bodyString)
        assert((typeof body === 'object'), 'JSON body must be an object')
        req.params = Object.assign((req.params || {}), body)
        next()
      } catch (e) {
        res.writeHead(400, {'Content-Type': 'application/json'})
        const body = {error: {type: 'invalid_json_body', message: e.message}}
        res.end(JSON.stringify(body))
        next(e)
      }
    })
  } else {
    next()
  }
}

module.exports = {
  bodyParser
}
