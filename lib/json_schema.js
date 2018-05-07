const {omit, getIn, merge, json, parseJson} = require('lib/util')
const Ajv = require('ajv')
const ajv = new Ajv({allErrors: true})

function resolveRefs (schema, fullSchema) {
  fullSchema = fullSchema || schema
  if (Array.isArray(schema)) {
    return schema.map(i => resolveRefs(i, fullSchema))
  } else if (typeof schema === 'object') {
    const refPath = (typeof schema['$ref'] === 'string') && schema['$ref'].startsWith('#/definitions') && schema['$ref'].substring(2).split('/')
    if (refPath) {
      const resolvedSchema = merge(omit(schema, ['$ref']), getIn(fullSchema, refPath))
      return resolveRefs(resolvedSchema, fullSchema) // recurse here to support nested refs
    } else {
      return Object.keys(schema).reduce((acc, key) => {
        acc[key] = resolveRefs(schema[key], fullSchema)
        return acc
      }, {})
    }
  } else {
    return schema
  }
}

function withoutRefs (schema) {
  return omit(resolveRefs(schema), ['definitions'])
}

function formatErrors (schema, doc, errors) {
  if (errors) {
    const status = 422
    const formattedErrors = errors.map(error => {
      return merge(error, {
        type: error.keyword
      })
    })
    return {schema, doc, errors: formattedErrors, status}
  } else {
    return undefined
  }
}

function validate (schema, data) {
  if (!data) return undefined
  const jsonString = json(data)
  if (jsonString === undefined) {
    console.error(`json_schema.validate - could not JSON serialize data of type ${typeof data}`, data)
    return {errors: [`Could not JSON serialize data of type ${typeof data}`]}
  }
  const validate = ajv.compile(schema)
  const jsonData = parseJson(jsonString)
  validate(jsonData)
  return formatErrors(schema, jsonData, validate.errors)
}

module.exports = {
  validate,
  withoutRefs
}
