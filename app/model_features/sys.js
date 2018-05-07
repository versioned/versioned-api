const model = {
  schema: {
    type: 'object',
    properties: {
      sys: {type: 'object', 'x-meta': {writable: false, versioned: false}}
    }
  }
}

module.exports = model
