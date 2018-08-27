const {zipObj, pick, getIn, json, last} = require('lib/util')
const MongoClient = require('mongodb').MongoClient
const ObjectId = require('mongodb').ObjectID
const createObjectId = ObjectId.createFromHexString
const {promiseAll} = require('lib/promise_helper')
const {validationError} = require('lib/errors')

function isMongoId (id) {
  return (typeof id === 'string') && id.match(/[a-z0-9]{24}/)
}

function makeMongoId (id) {
  if (typeof id === 'string' && isMongoId(id)) {
    return createObjectId(id)
  } else {
    return id
  }
}

function createId () {
  return new ObjectId().toString()
}

function parseDuplicateKey (error) {
  // "errmsg":"E11000 duplicate key error collection: versioned2_test.users index: email_1 dup key: { : \"ae33@example.com\" }","op":{"name":"ae33","email":"ae33@example.com","password":"0d20ce3d1e7ea9c5b7825c78ed7d0323","_id":"5ab925d24de8665751d31cd0"}}
  // "errmsg":"E11000 duplicate key error index: versioned2_development.users.$email_-1 dup key: { : \"asdfasdf@asdf\" }","op":{"_id":"5afe87caa5e1f0e4274ee91e","email":"asdfasdf@asdf","createdAt":"2018-05-18T07:59:06.912Z","createdBy":"5afe8786a5e1f0e4274ee91a","passwordHash":"10fe57694e0ccf7b13eb5b20a61038be"}} { BulkWriteError: E11000 duplicate key error index: versioned2_development.users.$email_-1 dup key: { : "asdfasdf@asdf"
  const indexMatch = error.errmsg.match(/ index: (\S+) /)
  if (indexMatch) {
    const index = indexMatch[1]
    let field = last(index.split('.')).replace(/^\$/, '').replace(/[0-9_-]*$/, '')
    const message = `already exists (must be unique)`
    return {field, message}
  }
}

// See: https://github.com/mongodb/mongo/blob/master/src/mongo/base/error_codes.err
function formatDbError (model, doc, error) {
  if (error.status && error.errors) return error // Don't wrap the error twice
  let info = {message: error.errmsg}
  try {
    if (error.code === 11000) {
      info = parseDuplicateKey(error)
    }
    return validationError(model, doc, info.message, info.field)
  } catch (e) {
    console.error(`formatDbError threw error e=${e.message} for error=${json(error)}`, e)
  }
}

function mongo (url) {
  let _db = null

  function connect () {
    if (_db) return Promise.resolve(_db)
    return new Promise((resolve, reject) => {
      const options = {connectTimeoutMS: 10000}
      MongoClient.connect(url, options, function (err, client) {
        if (err) {
          console.log(`Could not connect to mongodb url=${url} err=${err}`)
          return reject(err)
        }
        _db = client.db()
        console.log(`Connected to mongodb url=${url}`)
        resolve(_db)
      })
    })
  }

  function db () {
    return _db
  }

  async function getColls () {
    return (await connect()).listCollections().toArray().then(collections => {
      return collections.map(c => c.name)
    })
  }

  async function collStats (coll, options = {}) {
    const FIELDS = ['size', 'count', 'avgObjSize', 'storageSize', 'indexSizes']
    return (await connect()).collection(coll).stats(options)
      .then(s => pick(s, FIELDS))
      .catch(() => {
        // NOTE: if the collection hasn't been used it doesn't exist and this yields stats error
        return {size: 0, count: 0}
      })
  }

  async function dbStats (options = {}) {
    const colls = options.colls || (await getColls())
    const promises = zipObj(colls, colls.map(collStats))
    return promiseAll(promises)
  }

  async function createIndexes (coll, indexes, options = {}) {
    for (let index of indexes) {
      if (options.logger) options.logger.verbose(`createdIndexes coll=${coll} keys=${json(index.keys)} options=${json(index.options)}`)
      await (await connect()).collection(coll).createIndex(index.keys, index.options)
    }
  }

  // NOTE: potential race condition on init (unlikely, only on init, and not catastrophic):
  // If multiple clients were to invoke the nextSequence() method with the same name parameter, then the methods would observe one of the following behaviors:
  // Exactly one findAndModify() would successfully insert a new document.
  // Zero or more findAndModify() methods would update the newly inserted document.
  // Zero or more findAndModify() methods would fail when they attempted to insert a duplicate.
  // function initSequence (name) {
  //   return (await connect()).collection('sequences').insert({_id: name, seq: 0})
  // }
  async function nextSequence (name) {
    const query = {_id: name}
    const sort = [['_id', 'asc']]
    const update = {$inc: { seq: 1 }}
    const options = {upsert: true, new: true}
    return (await connect()).collection('sequences').findAndModify(query, sort, update, options)
      .then(result => getIn(result, ['value', 'seq']))
  }

  return {
    db,
    isMongoId,
    makeMongoId,
    createId,
    getColls,
    collStats,
    dbStats,
    connect,
    createIndexes,
    formatDbError,
    nextSequence
  }
}

module.exports = Object.assign(mongo, {
  formatDbError
})
