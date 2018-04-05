const {isObject, isArray, mapObj} = require('lib/util')

function childSchema (schema, property) {
  if (schema && schema.type === 'object' && schema.properties) {
    return schema.properties[property]
  } else if (schema && schema.type === 'array') {
    return schema.items
  } else {
    return undefined
  }
}

function parseDate (value) {
  if (typeof value === 'string') {
    return new Date(value)
  } else {
    return value
  }
}

function parseBool (value) {
  const FALSY_STRINGS = new Set(['0', 'false', 'FALSE', 'f'])
  if (typeof value === 'string') {
    return !FALSY_STRINGS.has(value)
  } else {
    return !!value
  }
}

function coerce (schema, value) {
  if (!schema) return value
  const type = schema && schema.type
  try {
    if (type === 'date') {
      return parseDate(value)
    } else if (type === 'boolean') {
      return parseBool(value)
    } else if (type === 'integer') {
      return parseInt(value)
    } else if (type === 'array' && isArray(value)) {
      return value.map(v => coerce(schema.items, v))
    } else if (type === 'object' && isObject(value)) {
      return mapObj(value, (k, v) => coerce(childSchema(schema, k), v))
    } else {
      return value
    }
  } catch (err) {
    return value
  }
}

module.exports = {
  childSchema,
  parseDate,
  parseBool,
  parseInt,
  coerce
}
