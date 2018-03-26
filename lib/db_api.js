// Mongodb API docs: http://mongodb.github.io/node-mongodb-native/3.0/api
function dbApi (db) {
  function find (coll, query = {}, options = {}) {
    // options:
    // sort: Array of indexes, [['a', 1]] etc.
    // projection: The fields to return in the query. Object of fields to include or exclude (not both), {'a':1}
    // limit: Sets the limit of documents returned in the query.
    // skip: Set to skip N documents ahead in your query (useful for pagination).
    return db.collection(coll).find(query, options).toArray()
  }

  function findOne (coll, query) {
    return db.collection(coll).findOne(query)
  }

  function count (coll, query = {}) {
    return db.collection(coll).count(query)
  }

  function create (coll, doc) {
    return db.collection(coll).insert(doc)
  }

  function update (coll, query, doc) {
    return db.collection(coll).updateOne(query, doc)
  }

  function remove (coll, query) {
    return db.collection(coll).remove(query)
  }

  return {
    find,
    findOne,
    count,
    create,
    update,
    remove
  }
}

module.exports = dbApi
