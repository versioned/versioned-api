const fs = require('fs')
const path = require('path')

function resolvePath (filePath) {
  if (filePath && filePath[0] === '~') {
    return path.join(process.env.HOME, filePath.slice(1))
  } else {
    return filePath
  }
}

function json (value) {
  return JSON.stringify(value, null, 4)
}

function readJsonFile (filePath) {
  return JSON.parse(fs.readFileSync(resolvePath(filePath)).toString())
}

function getConfig (defaultConfig) {
  const missingKeys = []
  const config = Object.keys(defaultConfig).reduce((acc, key) => {
    acc[key] = defaultConfig[key] === undefined ? process.env[key] : defaultConfig[key]
    if (acc[key] === undefined) missingKeys.push(key)
    return acc
  }, {})
  if (missingKeys.length > 0) throw new Error(`You need to provide the following environment variables: ${missingKeys.join(', ')}`)
  return config
}

module.exports = {
  json,
  readJsonFile,
  getConfig
}
