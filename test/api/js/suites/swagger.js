const jsonSchema = require('lib/json_schema')
const swaggerSchema = require('public/openapi-schema')

module.exports = async function (c) {
  let result = await c.get('get system swagger.json', '/swagger.json')
  let errors = jsonSchema.validate(swaggerSchema, result.body)
  c.assertEqual(errors, undefined)

  result = await c.get('get data swagger.json for space', `/data/${c.data.space.id}/swagger.json`)
  errors = jsonSchema.validate(swaggerSchema, result.body)
  c.assertEqual(errors, undefined)
}
