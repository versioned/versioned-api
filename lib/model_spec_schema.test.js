const {merge, omit, notEmpty} = require('lib/util')
const jsonSchema = require('lib/json_schema')
const specSchema = require('lib/model_spec_schema')
const metaSchema = require('lib/json_schema_meta')

function validate (spec, schema) {
  return jsonSchema.validate((schema || specSchema), spec)
}

function getError (spec, options = {}) {
  const error = validate(spec, options.schema)
  if (error) {
    expect(error.status).toEqual(422)
    expect(notEmpty(error.errors)).toBe(true)
    if (options.message) expect(error.errors[0].message.match(options.message)).toBeTruthy()
    if (options.type) expect(error.errors[0].type).toEqual(options.type)
    if (options.schemaPath) expect(error.errors[0].schemaPath).toEqual(options.schemaPath)
    return error
  } else {
    return undefined
  }
}

test('the schema part of a model must be valid', () => {
  const spec = {
    coll: 'foobar',
    schema: {
      type: 'object',
      properties: {
        title: {type: 'string', 'x-meta': {update: false}}
      }
    }
  }
  expect(getError(spec)).toBeFalsy()

  expect(getError(omit(spec, ['coll']),
    {type: 'required', message: /coll/})).toBeTruthy()

  expect(getError(merge(spec, {coll: 'invalid coll'}),
    {type: 'pattern', schemaPath: '#/properties/coll/pattern'})).toBeTruthy()

  expect(getError(omit(spec, ['schema']),
    {type: 'required', message: /schema/})).toBeTruthy()

  expect(getError(spec.schema, {schema: metaSchema})).toBeFalsy()

  // META SCHEMA:

  expect(getError(merge(spec.schema, {properties: {title: {type: 'integer'}}}),
    {schema: metaSchema})).toBeFalsy()

  expect(getError(merge(spec.schema, {properties: {title: {type: 'foobar'}}}),
    {schema: metaSchema})).toBeTruthy()
})
