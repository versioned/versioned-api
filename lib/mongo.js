const {zipObj, pick, getIn, json} = require('lib/util')
const MongoClient = require('mongodb').MongoClient
const createId = require('mongodb').ObjectID.createFromHexString
const logger = require('app/config').logger
const {promiseAll} = require('lib/promise_helper')

let _db = null

function db () {
  return _db
}

function isMongoId (id) {
  return (typeof id === 'string') && id.match(/[a-z0-9]{24}/)
}

function getColls () {
  return db().listCollections().toArray().then(collections => {
    return collections.map(c => c.name)
  })
}

async function collStats (coll, options = {}) {
  const FIELDS = ['size', 'count', 'avgObjSize', 'storageSize', 'indexSizes']
  return db().collection(coll).stats(options)
    .then(s => pick(s, FIELDS))
    .catch(() => {
      // NOTE: if the collection hasn't been used it doesn't exist and this yields stats error
      return {size: 0, count: 0}
    })
}

async function dbStats () {
  const colls = await getColls()
  const promises = zipObj(colls, colls.map(collStats))
  return promiseAll(promises)
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

async function createIndexes (coll, indexes) {
  for (let index of indexes) {
    logger.verbose(`createdIndexes coll=${coll} keys=${json(index.keys)} options=${json(index.options)}`)
    await db().collection(coll).createIndex(index.keys, index.options)
  }
}

function formatDbError (error) {
  // See: https://github.com/mongodb/mongo/blob/master/src/mongo/base/error_codes.err
  let errors = [error]
  const status = 422
  if (error.code === 11000) { // DuplicateKey
    // Example error: {"code":11000,"index":0,"errmsg":"E11000 duplicate key error collection: versioned2_test.users index: email_1 dup key: { : \"ae33@example.com\" }","op":{"name":"ae33","email":"ae33@example.com","password":"0d20ce3d1e7ea9c5b7825c78ed7d0323","_id":"5ab925d24de8665751d31cd0"}}
    const field = error.errmsg.match(/index: ([a-z._]+?)_\d/)[1]
    const message = `Duplicate value for ${field} - must be unique`
    errors = [{type: 'unique', message}]
  }
  return {status, errors}
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
  isMongoId,
  createId,
  getColls,
  collStats,
  dbStats,
  connect,
  createIndexes,
  formatDbError,
  nextSequence
}
