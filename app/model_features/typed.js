const {empty, isArray, getIn, merge} = require('lib/util')

function typedDoc (doc, options) {
  const type = getIn(options, 'model.type') || getIn(options, 'model.coll')
  return merge(doc, {type})
}

function addType (data, options) {
  if (empty(data)) {
    return data
  } else if (isArray(data)) {
    return data.map(doc => typedDoc(doc, options))
  } else {
    return typedDoc(data, options)
  }
}

const model = {
  schema: {
    type: 'object',
    properties: {
      type: {type: 'string', 'x-meta': {writable: false, versioned: false}}
    }
  },
  callbacks: {
    list: {
      after: [addType]
    },
    get: {
      after: [addType]
    },
    create: {
      afterSave: [addType]
    },
    update: {
      afterSave: [addType]
    }
  }
}

module.exports = model
