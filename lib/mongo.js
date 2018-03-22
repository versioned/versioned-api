const MongoClient = require('mongodb').MongoClient

function connect(url) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, function(err, client) {
      if (err) {
        console.log(`Could not connect to mongodb url=${url} err=${err}`, err)
        return reject(err)
      }
      const db = client.db()
      module.exports.db = db
      console.log(`Connected to mongodb url=${url}`)
      resolve(db)
    })
  })
}

module.exports = {
  url,
  connect
}
