const {zipObj} = require('lib/util')

// Like Promise.all but instead of taking an array takes an object of named promises
function promiseAll (promisesObj) {
  const keys = Object.keys(promisesObj)
  const promises = keys.map(key => promisesObj[key])
  return Promise.all(promises).then(results => {
    const data = zipObj(keys, results)
    return data
  })
}

module.exports = {
  promiseAll
}
