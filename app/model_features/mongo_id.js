const model = {
  schema: {
    type: 'object',
    properties: {
      _id: {type: 'string', pattern: '^[a-z0-9]{24}$', 'x-meta': {readable: false, writable: false}},
      id: {type: 'string', 'x-meta': {id: true, writable: false}}
    }
  }
}

module.exports = model
