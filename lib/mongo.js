const MongoClient = require('mongodb').MongoClient

let _db = null

function db() {
  return _db
}

function connect(url) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, function(err, client) {
      if (err) {
        console.log(`Could not connect to mongodb url=${url} err=${err}`, err)
        return reject(err)
      }
      _db = client.db()
      console.log(`Connected to mongodb url=${url}`)
      resolve(_db)
    })
  })
}

module.exports = {
  db,
  connect
}
