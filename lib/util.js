const extname = require('path').extname

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

function pick (keys, obj) {
  return keys.reduce(function (acc, key) {
    const value = obj[key]
    if (value !== undefined) {
      acc[key] = value
    }
    return acc
  }, {})
}

function difference (array1, array2) {
  return array1.filter(i => array2.indexOf(i) < 0)
}

function omit (keys, obj) {
  const pickKeys = difference(Object.keys(obj), keys)
  return pick(pickKeys, obj)
}

function nil (value) {
  return value === undefined || value === null
}

function notNil (value) {
  return !nil(value)
}

// Like: http://ramdajs.com/docs/#path
function getIn (obj, ...path) {
  let result = obj
  for (const key of path) {
    const value = (result && result[key])
    if (nil(value)) {
      return undefined
    } else {
      result = value
    }
  }
  return result
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
  return Object.assign({}, toObj, fromObj)
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
  return Array.isArray(value) ? value : [value]
}

function range (from, to) {
  const result = []
  for (let i = from; i <= to; ++i) {
    result.push(i)
  }
  return result
}

function compact (obj) {
  if (Array.isArray(obj)) {
    return obj.filter(notNil)
  } else {
    return Object.keys(obj).reduce((result, key) => {
      const value = obj[key]
      if (notNil(value)) result[key] = value
      return result
    }, {})
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
  if (Array.isArray(objOrArray)) {
    return objOrArray.slice(0)
  } else {
    return cloneObj(objOrArray)
  }
}

function empty (value) {
  if (nil(value)) {
    return true
  } else if (Array.isArray(value) || typeof value === 'string') {
    return value.length === 0
  } else if (typeof value === 'object') {
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

function concat (arrays) {
  return arrays.reduce((a1, a2) => a1.concat(a2))
}

function filter (obj, predicate) {
  if (Array.isArray(obj)) {
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

function prettyJson(value) {
  try {
    return JSON.stringify(value, null, 4)
  } catch (e) {
    return ''
  }
}

function safeJsonParse(data) {
  try {
    return JSON.parse(data)
  } catch (e) {
    return undefined
  }
}

module.exports = {
  zip,
  zipObj,
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
  evolve,
  array,
  range,
  compact,
  clone,
  empty,
  notEmpty,
  validInt,
  concat,
  filter,
  intersection,
  uniq,
  secondsFrom,
  secondsFromNow,
  rssDate,
  mimeType,
  uuid,
  prettyJson,
  safeJsonParse
}
