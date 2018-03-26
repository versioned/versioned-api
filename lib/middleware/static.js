const parseUrl = require('url').parse
const fs = require('fs')
const u = require('lib/util')

const serveStatic = function (baseDir) {
  return function (req, res, next) {
    if (req.method === 'GET') {
      const path = parseUrl(req.url).path
      const filePath = baseDir + path
      fs.stat(filePath, function (err, stat) {
        if (!err && stat.isFile()) {
          fs.readFile(filePath, function (_, data) {
            res.writeHead(200, {'Content-Type': u.mimeType(path)})
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
}

module.exports = {
  serveStatic
}
