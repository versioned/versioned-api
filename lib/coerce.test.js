const {coerce} = require('./coerce')

test('coerce - can coerce bool/date/int values in object', () => {
  const obj = {
    a: '0',
    b: '2018-04-05T06:50:34.785Z',
    c: '5',
    d: [{a: '0'}, {a: '0'}],
    e: {
      b: '2018-04-05T06:50:34.785Z'
    },
    f: 'foobar',
    g: null
  }
  const schema = {
    type: 'object',
    properties: {
      a: {type: 'boolean'},
      b: {type: 'date'},
      c: {type: 'integer'},
      d: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            a: {type: 'integer'}
          }
        }
      },
      e: {
        type: 'object',
        properties: {
          b: {type: 'date'}
        }
      },
      f: {type: 'string'}
    }
  }
  const expected = {
    a: false,
    b: new Date('2018-04-05T06:50:34.785Z'),
    c: 5,
    d: [{a: 0}, {a: 0}],
    e: {
      b: new Date('2018-04-05T06:50:34.785Z')
    },
    f: 'foobar',
    g: null
  }
  expect(coerce(schema, obj)).toEqual(expected)
})
