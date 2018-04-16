const {notEmpty, filter, getIn} = require('lib/util')
const swaggerUtil = require('lib/swagger_util')
const jsonSchema = require('lib/json_schema')
const {coerce} = require('lib/coerce')

const PARAM_TYPES = ['path', 'query']

function validateParams (req, res, next) {
  for (let paramType of PARAM_TYPES) {
    const swaggerParams = filter(getIn(req, ['route', 'parameters']), p => p.in === paramType)
    if (notEmpty(swaggerParams)) {
      const schema = swaggerUtil.parametersToSchema(swaggerParams)
      const paramsKey = `${paramType}Params`
      req[paramsKey] = coerce(schema, req[paramsKey])
      Object.assign(req.params, req[paramsKey])
      const errors = jsonSchema.validate(schema, req[paramsKey])
      if (errors) return next(errors)
    }
  }
  next()
}

module.exports = {
  validateParams
}
