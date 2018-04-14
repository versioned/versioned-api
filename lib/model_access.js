const {isArray, omit, concat, keys, getIn, filter} = require('lib/util')
const modelMeta = require('lib/model_meta')

function unwritableProperties (model) {
  const unwritable = (property) => getIn(property, ['x-meta', 'writable']) === false
  return keys(filter(modelMeta.properties(model), unwritable))
}

function unupdatableProperties (model) {
  const unupdatable = (property) => getIn(property, ['x-meta', 'update']) === false
  return keys(filter(modelMeta.properties(model), unupdatable))
}

function unreadableProperties (model) {
  const unreadable = (property) => getIn(property, ['x-meta', 'readable']) === false
  return keys(filter(modelMeta.properties(model), unreadable))
}

function readableDoc (model, doc) {
  return doc && modelMeta.withId(model, omit(doc, unreadableProperties(model)))
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

function updatableDoc (model, doc) {
  return doc && omit(doc, concat(unwritableProperties(model), unupdatableProperties(model)))
}

module.exports = {
  unwritableProperties,
  unreadableProperties,
  readableDoc,
  readableData,
  writableDoc,
  updatableDoc
}
