const jsonSchema = require('lib/json_schema')
const swaggerSchema = require('public/swagger-2.0-schema')

module.exports = async function (c) {
  let result = await c.get('get swagger.json', '/swagger.json')
  const swagger = result.body
  const errors = jsonSchema.validate(swaggerSchema, swagger)
  c.assertEqual(errors, undefined)
}
