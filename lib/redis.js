const { createClient } = require('redis')
const { promisify } = require('util')

// Example console usage with a valid REDIS_URL:
//
// const redis = require('./lib/redis')('redis://localhost:6379')
// redis.connect()
// redis.db().get('foobar').then(console.log) // => null
// redis.db().set('foobar', 1).then(console.log) // => OK
// redis.db().get('foobar').then(console.log) // => 1
//
// Without a REDIS_URL no connection is established:
//
// const redis = require('./lib/redis')(null)
// redis.connect()
// redis.db() // => null
//
function redis (url) {
  let _db = null

  function db () {
    return _db
  }

  function connect () {
    if (!url) return
    const redisClient = createClient({ url })

    redisClient.on('connect', () =>
      console.log(`Redis client connected url=${url}`)
    )
    redisClient.on('reconnecting', () =>
      console.log('Redis client lost connection, reconnecting...')
    )
    redisClient.on('error', err => {
      console.error('Redis client error:', err)
    })
    redisClient.on('warning', warn => console.log('Redis client warning:', warn))

    return new Promise(resolve => {
      redisClient.on('ready', () => {
        console.log('Redis client ready')
        const operations = ['get', 'set', 'del', 'ttl']
        _db = operations.reduce((acc, operation) => {
          acc[operation] = promisify(redisClient[operation]).bind(redisClient)
          return acc
        }, {})
        resolve(_db)
      })
    })
  }

  return {
    db,
    connect
  }
}

module.exports = redis
