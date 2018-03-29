const {getIn, json} = require('lib/util')
const MongoClient = require('mongodb').MongoClient
const logger = require('app/config').logger

let _db = null

function db () {
  return _db
}

function connect (url) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, function (err, client) {
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

async function createIndexes (coll, schema) {
  for (let property of Object.keys(schema.properties)) {
    const {index, unique} = getIn(schema, ['properties', property, 'x-meta'], {})
    if (index || unique) {
      const keys = {[property]: 1}
      const options = {unique}
      logger.debug(`createdIndexes coll=${coll} keys=${json(keys)} options=${json(options)}`)
      await db().collection(coll).createIndex(keys, options)
    }
  }
}

function formatDbError (error) {
  // See: https://github.com/mongodb/mongo/blob/master/src/mongo/base/error_codes.err
  let errors = [error]
  if (error.code === 11000) { // DuplicateKey
    // Example error: {"code":11000,"index":0,"errmsg":"E11000 duplicate key error collection: versioned2_test.users index: email_1 dup key: { : \"ae33@example.com\" }","op":{"name":"ae33","email":"ae33@example.com","password":"0d20ce3d1e7ea9c5b7825c78ed7d0323","_id":"5ab925d24de8665751d31cd0"}}
    const field = error.errmsg.match(/index: ([a-z_]+?)_\d/)[1]
    const message = `Duplicate value for ${field} - must be unique`
    errors = [{type: 'unique', message}]
  }
  return {errors}
}

// NOTE: potential race condition on init (unlikely, only on init, and not catastrophic):
// If multiple clients were to invoke the nextSequence() method with the same name parameter, then the methods would observe one of the following behaviors:
// Exactly one findAndModify() would successfully insert a new document.
// Zero or more findAndModify() methods would update the newly inserted document.
// Zero or more findAndModify() methods would fail when they attempted to insert a duplicate.
// function initSequence (name) {
//   return db().collection('sequences').insert({_id: name, seq: 0})
// }
function nextSequence (name) {
  const query = {_id: name}
  const sort = [['_id', 'asc']]
  const update = {$inc: { seq: 1 }}
  const options = {upsert: true, new: true}
  return db().collection('sequences').findAndModify(query, sort, update, options)
    .then(result => getIn(result, ['value', 'seq']))
}

module.exports = {
  db,
  connect,
  createIndexes,
  formatDbError,
  nextSequence
}
