const {json, notEmpty, merge, uuid} = require('lib/util')

async function findAvailableKey (mongo, coll, propertyName, options = {}) {
  const defaultOptions = {prefix: '', length: 8}
  const {prefix, startKey, length} = merge(defaultOptions, options)
  let key, keyExists
  const MAX_ATTEMPTS = 1000
  let attempts = 0
  do {
    if (attempts === 0 && notEmpty(startKey)) {
      key = prefix + startKey.substring(0, length)
    } else {
      key = prefix + uuid(length)
    }
    const query = {[propertyName]: key}
    keyExists = await mongo.db().collection(coll).count(query)
    attempts += 1
    if (attempts > MAX_ATTEMPTS) throw new Error(`Could not find available key after ${MAX_ATTEMPTS} attempts for coll=${coll} propertyName=${propertyName} options=${json(options)}`)
  } while (keyExists)
  return key
}

module.exports = {
  findAvailableKey
}
