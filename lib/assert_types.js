// From: https://github.com/peter/assert-duck-type/blob/master/index.js
const inspect = require('util').inspect
const toString = Object.prototype.toString

function typeOf(value) {
  let type = typeof value
  if (type === 'object') {
    if (value === null) {
      type = 'null'
    } else if (value === undefined) {
      type = 'undefined'
    } else if ((typeof value.length === 'number') && toString.call(value) === '[object Array]') {
      type = 'array'
    } else if (toString.call(value) === '[object Date]') {
      type = 'date'
    } else if (toString.call(value) === '[object RegExp]') {
      type = 'regexp'
    }
  }
  return type
}

function validType(type, value) {
  if (typeOf(type) === 'string') {
    if (type.indexOf('?') === (type.length-1)) {
      if (value === null || value === undefined) return true
      type = type.substring(0, type.length-1)
    }
    const validTypes = type.split('|')
    for (let i = 0; i < validTypes.length; ++i) {
      if (typeOf(value) === validTypes[i]) return true
    }
    return false
  } else if (typeOf(type) === 'object') {
    const keys = Object.keys(type)
    for (let i = 0; i < keys.length; ++i) {
      if (!validType(type[keys[i]], (value && value[keys[i]]))) {
        return false
      }
    }
    return true
  } else if (typeOf(type) === 'array') {
    if (typeOf(value) === 'array') {
      if (value.length === 0) return true
      for (let i = 0; i < value.length; ++i) {
        if (!validType(type[0], (value && value[i]))) {
          return false
        }
      }
      return true
    } else {
      return false
    }
  } else {
    throw new Error('Cannot parse type ' + type)
  }
};

function checkTypes(args, types) {
  const invalidTypes = [];
  for (let i = 0; i < types.length; ++i) {
    const type = types[i]
    const value = args[i]
    if (!validType(type, value)) {
      invalidTypes.push({i: i, expected_type: type, actual_type: typeOf(value), value: value})
    }
  }
  if (invalidTypes.length > 0) {
    const message = 'Invalid types: ' + inspect(invalidTypes)
    const err = new Error(message)
    err.invalidTypes = invalidTypes;
    return err
  } else {
    return null
  }
}

function assertTypes(args) {
  const types = Array.prototype.slice.call(arguments, 1)
  const err = checkTypes(args, types)
  if (err) throw err
}

assertTypes.typeOf = typeOf
assertTypes.validType = validType
assertTypes.checkTypes = checkTypes

module.exports = assertTypes
