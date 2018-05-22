const {compact, omit, getIn, merge, json, parseJson, prettyJson} = require('lib/util')
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

function extractField (error) {
  const match = getIn(error, 'schemaPath', '').match(/properties\/([^/]+)/)
  return match && match[1]
}

function formatErrors (schema, doc, errors) {
  if (errors) {
    const status = 422
    const formattedErrors = compact(errors.map(error => {
      let field = extractField(error)
      if (error.keyword === 'additionalProperties' && error.dataPath === '') {
        field = getIn(error, 'params.additionalProperty')
        return {field, message: `field is not allowed`, type: 'unrecognized'}
      } else if (error.keyword === 'required' && error.dataPath === '') {
        field = getIn(error, 'params.missingProperty')
        return {field, message: 'must be provided', type: 'required'}
      } else if (error.keyword === 'pattern' && error.schemaPath.match(/#\/properties\/([^/]+)\/pattern/)) {
        field = error.dataPath.substring(1)
        const pattern = getIn(error, 'params.pattern')
        return {field, message: `should match pattern ${pattern}`, type: 'pattern'}
      } else if (error.keyword === 'enum' && error.dataPath.match(/^\.[^.]+$/)) {
        field = error.schemaPath.match(/properties\/([^/]+)/)[1]
        const allowedValues = getIn(error, 'params.allowedValues')
        return {field, message: `must be one of these values: ${allowedValues.join(', ')}`, type: 'enum'}
      } else {
        console.info(`jsonSchema.formatErrors - could not parse error=${prettyJson(error)} for doc=${prettyJson(doc)}`)
        return merge(error, {field})
      }
    }))
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
