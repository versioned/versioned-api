const {titleProperty} = require('./model_meta')

test('titleProperty - can return configured title field or default to title/name/id', () => {
  expect(titleProperty(null)).toEqual(undefined)
  expect(titleProperty({})).toEqual(undefined)
  expect(titleProperty({schema: {'x-meta': {titleProperty: 'foobar'}}})).toEqual('foobar')
  expect(titleProperty({schema: {
    'x-meta': {titleProperty: 'foobar'},
    properties: {
      title: {type: 'string'}
    }
  }})).toEqual('foobar')
  expect(titleProperty({schema: {
    properties: {
      id: {type: 'string'},
      title: {type: 'string'},
      name: {type: 'string'}
    }
  }})).toEqual('title')
  expect(titleProperty({schema: {
    properties: {
      name: {type: 'string'},
      foobar: {type: 'string'}
    }
  }})).toEqual('name')
  expect(titleProperty({schema: {
    properties: {
      foobar: {type: 'string'}
    }
  }})).toEqual('foobar')
  expect(titleProperty({schema: {
    'x-meta': {
      propertiesOrder: ['bar', 'foo']
    },
    properties: {
      foo: {type: 'string'},
      bar: {type: 'string'}
    }
  }})).toEqual('bar')
})
