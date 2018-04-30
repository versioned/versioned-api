const headers = {
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Headers': 'Authorization,Content-Type,Accept,Origin,User-Agent,DNT,Cache-Control,X-Mx-ReqToken,Keep-Alive,X-Requested-With,If-Modified-Since,X-CSRF-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTION',
  'Access-Control-Allow-Origin': '*'
}

function setCorsHeaders (req, res, next) {
  Object.keys(headers).forEach(header => {
    res.setHeader(header, headers[header])
  })
  if (req.method === 'OPTIONS') {
    res.end()
  } else {
    next()
  }
}

module.exports = {setCorsHeaders}
