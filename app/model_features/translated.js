const {isArray, array, empty, keys, merge, concat, keyValues, filter, getIn, notEmpty} = require('lib/util')
const {validationError} = require('lib/errors')
const {codeToLanguage, languageToCode} = require('lib/language_codes')

function translatedProperties (model) {
  return filter(getIn(model, 'schema.properties'), (p) => getIn(p, 'x-meta.translated'))
}

function languageParam (languages) {
  const validValues = languages.map(languageToCode)
  return {
    name: 'language',
    in: 'query',
    description: 'Language to return, given as an ISO 639-1 code',
    required: false,
    schema: {
      enum: validValues
    }
  }
}

function addTranslatedParameters (route, options) {
  const languages = getIn(options, 'space.languages')
  if (languages && notEmpty(translatedProperties(options.model))) {
    return merge(route, {
      parameters: concat(route.parameters, [languageParam(languages)])
    })
  }
}

function validateTranslatedFields (doc, options) {
  for (let [property, {maxLength}] of keyValues(translatedProperties(options.model))) {
    for (let [code, value] of keyValues(doc[property])) {
      if (!codeToLanguage(code)) {
        throw validationError(options.model, doc, `Language code ${code} not supported`, `${property}.${code}`)
      }
      if (value && maxLength && value.length > maxLength) {
        throw validationError(options.model, doc, `Translation for language ${codeToLanguage[code]} (${code}) can not be longer than ${maxLength}`, `${property}.${code}`)
      }
    }
  }
}

async function selectLanguage (data, options) {
  const languageCode = getIn(options, 'queryParams.language')
  const translatedFields = keys(translatedProperties(options.model))
  if (empty(data) || empty(translatedFields) || !languageCode) return data
  const docs = array(data)
  const docsWithLanguage = docs.map(doc => {
    const languageProperties = translatedFields.reduce((acc, key) => {
      acc[key] = getIn(doc, `${key}.${languageCode}`)
      return acc
    }, {})
    return merge(doc, languageProperties)
  })
  return isArray(data) ? docsWithLanguage : docsWithLanguage[0]
}

const model = {
  callbacks: {
    save: {
      beforeValidation: [validateTranslatedFields]
    },
    list: {
      after: [selectLanguage]
    },
    get: {
      after: [selectLanguage]
    },
    routeCreate: {
      after: [addTranslatedParameters]
    }
  }
}

module.exports = model
