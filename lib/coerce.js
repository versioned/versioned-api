const {getIn, notNil, isArray, mapObj} = require('lib/util')

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
    const date = new Date(value)
    return isNaN(date.getTime()) ? value : date
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
  const type = schema.type
  const customCoerce = getIn(schema, 'x-meta.coerce')
  try {
    if (customCoerce) {
      return customCoerce(value)
    } else if ((type === 'date' || (type === 'string' && schema.format === 'date-time')) && typeof value === 'string') {
      return parseDate(value)
    } else if (type === 'boolean' && typeof value === 'string') {
      return parseBool(value)
    } else if (type === 'integer' && typeof value === 'string') {
      return parseInt(value)
    } else if (type === 'array' && isArray(value)) {
      return value.map(v => coerce(schema.items, v))
    } else if (type === 'array' && typeof value === 'string') {
      return value.split(',').map(v => v.trim())
    } else if (type === 'object' && notNil(value) && typeof value === 'object') {
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
