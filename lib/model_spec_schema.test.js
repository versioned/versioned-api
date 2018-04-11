const {nil} = require('lib/util')
const jsonSchema = require('lib/json_schema')
const specSchema = require('lib/model_spec_schema')

test('the schema part of a model must be valid', () => {
  const spec = {}
  const errors = jsonSchema.validate(specSchema, spec)
  expect(nil(errors)).toBe(false)
})
