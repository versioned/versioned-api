const {compact, values, merge, pick, intersection, isArray, keys, getIn, filter} = require('lib/util')
const modelMeta = require('lib/model_meta')
const {withoutRefs} = require('lib/json_schema')

const writable = (property) => getIn(property, ['x-meta', 'writable']) !== false
const updatable = (property) => writable(property) && getIn(property, ['x-meta', 'update']) !== false

function schema (model, properties) {
  return withoutRefs(merge(model.schema, {
    properties: pick(model.schema.properties, properties),
    required: intersection(model.schema.required, properties)
  }))
}

function writableProperties (model) {
  return keys(filter(modelMeta.properties(model), writable))
}

function updatableProperties (model) {
  return keys(filter(modelMeta.properties(model), updatable))
}

function relationshipNameProperties (model) {
  return compact(values(modelMeta.properties(model)).map(property => {
    return getIn(property, 'x-meta.relationship.name')
  }))
}

function readableProperties (model) {
  const readable = (property) => getIn(property, ['x-meta', 'readable']) !== false
  const properties = keys(filter(modelMeta.properties(model), readable))
  return properties.concat(relationshipNameProperties(model))
}

function readableDoc (model, doc) {
  return doc && pick(modelMeta.withId(model, doc), readableProperties(model))
}

function readableData (model, data) {
  if (isArray(data)) {
    return data.map(doc => readableDoc(model, doc))
  } else {
    return readableDoc(model, data)
  }
}

function readableSchema (model) {
  return schema(model, readableProperties(model))
}

function writableDoc (model, doc) {
  return filteredDoc(model.schema, doc, writable)
}

function writableSchema (model) {
  return schema(model, writableProperties(model))
}

function updatableDoc (model, doc) {
  return filteredDoc(model.schema, doc, updatable)
}

function filteredDoc (schema, doc, predicate) {
  const allKeys = keys(schema.properties)
  const filteredKeys = keys(filter(schema.properties, predicate))
  return doc && keys(doc).reduce((acc, key) => {
    if (filteredKeys.includes(key) || (!allKeys.includes(key) && schema.additionalProperties !== false)) {
      const value = doc[key]
      const subSchema = getIn(schema, `properties.${key}`)
      if (isArray(value) && (typeof value[0] === 'object') && getIn(subSchema, 'items')) {
        acc[key] = value.map(v => filteredDoc(subSchema.items, v, predicate))
      } else if (typeof value === 'object' && getIn(subSchema, 'type') === 'object') {
        acc[key] = filteredDoc(subSchema, value, predicate)
      } else {
        acc[key] = value
      }
    }
    return acc
  }, {})
}

function updatableSchema (model, doc) {
  return schema(model, updatableProperties(model))
}

function requestSchema (model, endpoint) {
  if (!model) return undefined
  return {
    create: writableSchema(model),
    update: updatableSchema(model)
  }[endpoint]
}

function responseSchema (model, endpoint) {
  if (!model) return undefined
  const schema = readableSchema(model)
  if (endpoint === 'list') {
    return {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: schema
        }
      }
    }
  } else {
    return {
      type: 'object',
      properties: {
        data: schema
      }
    }
  }
}

module.exports = {
  writableProperties,
  updatableProperties,
  readableProperties,
  readableDoc,
  readableData,
  readableSchema,
  writableDoc,
  writableSchema,
  updatableDoc,
  updatableSchema,
  requestSchema,
  responseSchema
}
