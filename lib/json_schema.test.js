const {withoutRefs} = require('lib/json_schema')

test('withoutRefs - resolves $ref references and removes definitions', () => {
  const schema = {
    definitions: {
      key: {type: 'string'},
      space: {type: 'integer'}
    },
    type: 'object',
    properties: {
      key: {$ref: '#/definitions/key'},
      space: {$ref: '#/definitions/space', 'x-meta': {update: false}}
    }
  }
  const expected = {
    type: 'object',
    properties: {
      key: {type: 'string'},
      space: {type: 'integer', 'x-meta': {update: false}}
    }
  }
  expect(withoutRefs(schema)).toEqual(expected)
})
