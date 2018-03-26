const Ajv = require('ajv')
const ajv = new Ajv({allErrors: true})

function validate (schema, json) {
  const validate = ajv.compile(schema)
  validate(json)
  const errors = validate.errors
  return errors ? {errors} : undefined
}

module.exports = {
  validate
}
