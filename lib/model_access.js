const {isArray, omit, keys, getIn, filter} = require('lib/util')
const modelMeta = require('lib/model_meta')

function unwritableProperties (model) {
  const isWritable = (property) => getIn(property, ['x-meta', 'writable']) === false
  return keys(filter(modelMeta.properties(model), isWritable))
}

function unreadableProperties (model) {
  const isReadable = (property) => getIn(property, ['x-meta', 'readable']) === false
  return keys(filter(modelMeta.properties(model), isReadable))
}

function readableDoc (model, doc) {
  return doc && omit(doc, unreadableProperties(model))
}

function readableData (model, data) {
  if (isArray(data)) {
    return data.map(doc => readableDoc(model, doc))
  } else {
    return readableDoc(model, data)
  }
}

function writableDoc (model, doc) {
  return doc && omit(doc, unwritableProperties(model))
}

module.exports = {
  unwritableProperties,
  unreadableProperties,
  readableDoc,
  readableData,
  writableDoc
}
