const extname = require('path').extname

function isArray (value) {
  return Array.isArray(value)
}

// See: https://stackoverflow.com/questions/5876332/how-can-i-differentiate-between-an-object-literal-other-javascript-objects
function isObject (value) {
  return notNil(value) && typeof value === 'object' && value.constructor === Object
}

function keys (obj) {
  return Object.keys(obj)
}

function set (array) {
  return new Set(array)
}

function append (array, value) {
  if (nil(array)) return undefined
  return array.concat([value])
}

function zip (arrays) {
  return arrays[0].map(function (_, i) {
    return arrays.map(function (array) {
      return array[i]
    })
  })
}

function zipObj (keys, values) {
  return zip([keys, values]).reduce(function (obj, tuple) {
    obj[tuple[0]] = tuple[1]
    return obj
  }, {})
}

function unzipObj (obj) {
  const keys = Object.keys(obj)
  const values = keys.map(key => obj[key])
  return zip([keys, values])
}

const keyValues = unzipObj

function reverse (array) {
  const result = []
  for (let i = (array.length - 1); i >= 0; i--) {
    result.push(array[i])
  }
  return result
}

function compose (...fns) {
  return function (arg) {
    return reverse(fns).reduce(function (result, fn) {
      return fn(result)
    }, arg)
  }
}

function property (name) {
  return function (obj) {
    return obj ? obj[name] : obj
  }
}

function groupBy (array, groupFn) {
  return array.reduce(function (acc, item) {
    const key = groupFn(item)
    acc[key] = acc[key] || []
    acc[key].push(item)
    return acc
  }, {})
}

function difference (array1, array2) {
  return array1.filter(i => array2.indexOf(i) < 0)
}

function nil (value) {
  return value === undefined || value === null
}

function notNil (value) {
  return !nil(value)
}

// Like: http://ramdajs.com/docs/#path
function getIn (obj, path, defaultValue) {
  let result = obj
  for (const key of path) {
    const value = (result && result[key])
    if (nil(value)) {
      return defaultValue
    } else {
      result = value
    }
  }
  return result
}

function pick (obj, keys) {
  if (empty(keys)) return {}
  return keys.reduce(function (acc, key) {
    const value = obj[key]
    if (value !== undefined) {
      acc[key] = value
    }
    return acc
  }, {})
}

function omit (obj, keys) {
  const pickKeys = difference(Object.keys(obj), keys)
  return pick(pickKeys, obj)
}

function safeCall (fn, arg, safe = notNil) {
  if (safe(arg)) {
    try {
      return fn(arg)
    } catch (err) {
      return undefined
    }
  } else {
    return arg
  }
}

function toInt (value) {
  return Math.floor(value)
}

function merge (toObj, fromObj) {
  const objects = compact([toObj, fromObj]) || []
  const args = concat([{}], objects)
  return Object.assign.apply(null, args)
}

function deepMerge (toObj, fromObj, options = {}) {
  if (nil(toObj) || nil(fromObj)) return toObj || fromObj || {}
  const fromKeys = set(keys(fromObj))
  const allKeys = concat(keys(toObj), keys(fromObj))
  return allKeys.reduce((acc, key) => {
    const toValue = toObj[key]
    const fromValue = fromObj[key]
    if (isObject(toValue) && isObject(fromValue)) {
      acc[key] = deepMerge(toValue, fromValue, options)
    } else if (options.concat && isArray(toValue) && isArray(fromValue)) {
      acc[key] = concat(toValue, fromValue)
    } else {
      acc[key] = fromKeys.has(key) ? fromValue : toValue
    }
    return acc
  }, {})
}

function deepMergeConcat (toObj, fromObj) {
  return deepMerge(toObj, fromObj, {concat: true})
}

// See: http://ramdajs.com/docs/#evolve
function evolve (obj, transformations) {
  return Object.keys(obj).reduce((result, key) => {
    const value = obj[key]
    result[key] = transformations[key] ? transformations[key](value) : value
    return result
  }, {})
}

function array (value) {
  return isArray(value) ? value : [value]
}

function range (from, to) {
  const result = []
  for (let i = from; i < to; ++i) {
    result.push(i)
  }
  return result
}

// Alternative name: removeEmpty
function compact (value) {
  const predicate = notEmpty
  if (isArray(value)) {
    const result = value.map(compact).filter(predicate)
    return empty(result) ? undefined : result
  } else if (isObject(value)) {
    const result = Object.keys(value).reduce((acc, key) => {
      const v = compact(value[key])
      if (predicate(v)) acc[key] = v
      return acc
    }, {})
    return empty(result) ? undefined : result
  } else if (empty(value)) {
    return undefined
  } else {
    return value
  }
}

function cloneObj (obj) {
  if (obj == null || typeof obj !== 'object') return obj
  const copy = obj.constructor()
  for (const attr in obj) {
    if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr]
  }
  return copy
}

function clone (objOrArray) {
  if (isArray(objOrArray)) {
    return objOrArray.slice(0)
  } else {
    return cloneObj(objOrArray)
  }
}

// Complement - logical inverse of function
function not (fn) {
  return function (...args) {
    return !fn(...args)
  }
}

function empty (value) {
  if (nil(value)) {
    return true
  } else if (isArray(value) || typeof value === 'string') {
    return value.length === 0
  } else if (isObject(value)) {
    return Object.keys(value).length === 0
  } else {
    return false
  }
}

function notEmpty (value) {
  return !empty(value)
}

function validInt (value) {
  return notNil(value) && value.match(/^[1-9][0-9]*$/)
}

function concat (...arrays) {
  return arrays.filter(notNil).reduce((a1, a2) => a1.concat(a2), [])
}

// NOTE: only flattens one level
function flatten (array) {
  return concat(...array)
}

function filter (obj, predicate) {
  if (isArray(obj)) {
    return obj.filter(predicate)
  } else {
    return Object.keys(obj).reduce((result, key) => {
      const value = obj[key]
      if (predicate(value)) result[key] = value
      return result
    }, {})
  }
}

function intersection (tags1, tags2) {
  return array(tags1).filter(t => array(tags2).includes(t))
}

function uniq (array) {
  return Array.from(new Set(array))
}

function secondsFrom (date, seconds) {
  const result = new Date(date.getTime())
  result.setTime(date.getTime() + seconds * 1000)
  return result
}

// See: http://www.comptechdoc.org/independent/web/cgi/javamanual/javadate.html
function secondsFromNow (seconds) {
  return secondsFrom(new Date(), seconds)
}

// Mon, 13 Jul 2015 08:00:48 +0000
// pubDate
function rssDate (date) {
  if (typeof date === 'string') {
    date = new Date(date)
  }
  const pieces = date.toString().split(' ')
  const offsetTime = pieces[5].match(/[-+]\d{4}/)
  const offset = offsetTime || pieces[5]
  const parts = [
    pieces[0] + ',',
    pieces[2],
    pieces[1],
    pieces[3],
    pieces[4],
    offset
  ]
  return parts.join(' ')
}

// NOTE: could use https://www.npmjs.com/package/mime
const mimeTypes = {
  '.html': 'text/html',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml'
}

function mimeType (path) {
  return mimeTypes[extname(path)]
}

function uuid (length = 4) {
  const time = (new Date()).valueOf().toString()
  const random = Math.random().toString()
  return require('crypto').createHash('sha1').update(time + random).digest('hex').substring(0, length)
}

function json (value) {
  return JSON.stringify(value)
}

function prettyJson (value) {
  try {
    return JSON.stringify(value, null, 4)
  } catch (e) {
    return ''
  }
}

function safeJsonParse (data) {
  try {
    return JSON.parse(data)
  } catch (e) {
    return undefined
  }
}

module.exports = {
  isArray,
  isObject,
  keys,
  set,
  append,
  zip,
  zipObj,
  unzipObj,
  keyValues,
  reverse,
  compose,
  property,
  groupBy,
  pick,
  omit,
  getIn,
  nil,
  notNil,
  safeCall,
  toInt,
  merge,
  deepMerge,
  deepMergeConcat,
  evolve,
  array,
  range,
  compact,
  clone,
  not,
  empty,
  notEmpty,
  validInt,
  concat,
  flatten,
  filter,
  intersection,
  difference,
  uniq,
  secondsFrom,
  secondsFromNow,
  rssDate,
  mimeType,
  uuid,
  json,
  prettyJson,
  safeJsonParse
}
