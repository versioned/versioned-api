const {getIn} = require('lib/util')
const {withoutRefs, schemaPath} = require('lib/json_schema')

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

test('schemaPath - returns schema path corresponding to nested object/array path', () => {
  const schema = {
    type: 'object',
    properties: {
      k1: {'x-id': 'k1'},
      k2: {
        type: 'object',
        properties: {
          k3: {'x-id': 'k3'},
          k4: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                k5: {'x-id': 'k5'}
              }
            }
          }
        }
      }
    }
  }
  let path = schemaPath(['k1'], schema)
  expect(path).toEqual(['properties', 'k1'])
  expect(getIn(schema, path)).toEqual({'x-id': 'k1'})

  path = schemaPath(['k2', 'k3'], schema)
  expect(path).toEqual(['properties', 'k2', 'properties', 'k3'])
  expect(getIn(schema, path)).toEqual({'x-id': 'k3'})

  path = schemaPath(['k2', 'k4', 'k5'], schema)
  expect(path).toEqual(['properties', 'k2', 'properties', 'k4', 'items', 'properties', 'k5'])
  expect(getIn(schema, path)).toEqual({'x-id': 'k5'})
})
