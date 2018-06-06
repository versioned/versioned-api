const parseUrl = require('url').parse
const fs = require('fs')
const u = require('lib/util')

function serveStatic (baseDir) {
  function _serveStatic (req, res, next) {
    if (req.method === 'GET') {
      const path = parseUrl(req.url).pathname
      const filePath = baseDir + path
      fs.stat(filePath, function (err, stat) {
        if (!err && stat.isFile()) {
          fs.readFile(filePath, function (_, data) {
            res.writeHead(200, u.compact({'Content-Type': u.mimeType(path)}))
            res.end(data)
          })
        } else {
          next()
        }
      })
    } else {
      next()
    }
  }
  return _serveStatic
}

module.exports = {
  serveStatic
}
