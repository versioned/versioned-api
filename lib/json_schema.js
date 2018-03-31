const {json, parseJson} = require('lib/util')
const logger = require('app/config').logger
const Ajv = require('ajv')
const ajv = new Ajv({allErrors: true})

function validate (schema, data) {
  const jsonData = json(data)
  if (jsonData === undefined) {
    logger.debug(`json_schema.validate - could not JSON serialize data of type ${typeof data}`, data)
    return {errors: [`Could not JSON serialize data of type ${typeof data}`]}
  }
  const validate = ajv.compile(schema)
  validate(parseJson(jsonData))
  const errors = validate.errors
  const status = 422
  return errors ? {errors, status} : undefined
}

module.exports = {
  validate
}
