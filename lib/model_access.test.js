const {
  readableDoc,
  readableData,
  writableDoc
} = require('./model_access')

const model = {
  schema: {
    type: 'object',
    properties: {
      title: {type: 'string'},
      readable_key: {type: 'string', 'x-meta': {writable: false}},
      writable_key: {type: 'string', 'x-meta': {readable: false}},
      hidden_key: {type: 'string', 'x-meta': {readable: false, writable: false}}
    }
  }
}

const doc = {
  title: 'the title',
  readable_key: 'the-readable-key',
  writable_key: 'the-writable-key',
  hidden_key: 'the-hidden-key'
}

test('readableDoc', () => {
  expect(readableDoc(model, doc)).toEqual({title: 'the title', readable_key: 'the-readable-key'})
})

test('readableData - array', () => {
  expect(readableData(model, [doc])).toEqual([{title: 'the title', readable_key: 'the-readable-key'}])
})

test('readableData - doc', () => {
  expect(readableData(model, doc)).toEqual({title: 'the title', readable_key: 'the-readable-key'})
})

test('writableDoc', () => {
  expect(writableDoc(model, doc)).toEqual({title: 'the title', writable_key: 'the-writable-key'})
})
