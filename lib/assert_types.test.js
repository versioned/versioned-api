const typeOf = require('./assert_types').typeOf
const validType = require('./assert_types').validType

test('typeOf - works with null and undefined', () => {
  expect(typeOf(null)).toBe('null')
  expect(typeOf()).toBe('undefined')
  expect(typeOf(undefined)).toBe('undefined')
})

test('typeOf - works with primitive types', () => {
  expect(typeOf(5)).toBe('number')
  expect(typeOf(6.34)).toBe('number')
  expect(typeOf(true)).toBe('boolean')
  expect(typeOf(false)).toBe('boolean')
  expect(typeOf('foobar')).toBe('string')
})

test('typeOf - works with arrays, plain objects, and functions', () => {
  expect(typeOf({})).toBe('object')
  expect(typeOf({foo: 1})).toBe('object')
  expect(typeOf([])).toBe('array')
  expect(typeOf(function() {})).toBe('function')
})

test('typeOf - works with RegExp and Date', () => {
  expect(typeOf(new Date())).toBe('date')
  expect(typeOf(/foobar/)).toBe('regexp')
})

it('validType - works with string types', () => {
  expect(validType('string', 'foobar')).toBe(true)
  expect(validType('string', 5)).toBe(false)

  expect(validType('number', 5)).toBe(true)
  expect(validType('number', '5')).toBe(false)

  expect(validType('boolean', true)).toBe(true)
  expect(validType('boolean', false)).toBe(true)
  expect(validType('boolean', 'true')).toBe(false)

  expect(validType('object', {})).toBe(true)
  expect(validType('object', {foo: 1})).toBe(true)
  expect(validType('object', function() {})).toBe(false)
  expect(validType('object', new Date())).toBe(false)
  expect(validType('object', /foobar/)).toBe(false)

  expect(validType('function', function() {})).toBe(true)
  expect(validType('array', [])).toBe(true)
  expect(validType('array', [1, 2])).toBe(true)
})

it('validType - works with optional string types that also allow null/undefined', () => {
  expect(validType('string?', 'foobar')).toBe(true)
  expect(validType('string?', null)).toBe(true)
  expect(validType('string?', undefined)).toBe(true)
  expect(validType('string?', 5)).toBe(false)
  expect(validType('string?', true)).toBe(false)

  expect(validType('number?', 5)).toBe(true)
  expect(validType('number?', null)).toBe(true)
  expect(validType('number?', '5')).toBe(false)

  expect(validType('boolean?', true)).toBe(true)
  expect(validType('boolean?', false)).toBe(true)
  expect(validType('boolean?', null)).toBe(true)
  expect(validType('boolean?', undefined)).toBe(true)
  expect(validType('boolean?', 'true')).toBe(false)
})

it('validType - works with strings containing multiple types separated by pipe', () => {
  expect(validType('string|number', 'foobar')).toBe(true)
  expect(validType('string|number', 5)).toBe(true)
  expect(validType('string|number', true)).toBe(false)
  expect(validType('string|number', true)).toBe(false)
  expect(validType('string|number', null)).toBe(false)
  expect(validType('string|number', undefined)).toBe(false)

  expect(validType('string|number?', 'foobar')).toBe(true)
  expect(validType('string|number?', 5)).toBe(true)
  expect(validType('string|number?', true)).toBe(false)
  expect(validType('string|number?', true)).toBe(false)
  expect(validType('string|number?', null)).toBe(true)
  expect(validType('string|number?', undefined)).toBe(true)

  expect(validType('string|number|boolean', 'false')).toBe(true)
  expect(validType('string|number|boolean', 3.2)).toBe(true)
  expect(validType('string|number|boolean', true)).toBe(true)
  expect(validType('string|number|boolean', [])).toBe(false)
  expect(validType('string|number|boolean', {})).toBe(false)
})

it('validType - works with object types', () => {
  expect(validType({foo: 'string'}, {foo: 'bar'})).toBe(true)
  expect(validType({foo: 'string'}, {foo: 'bar', baz: 1})).toBe(true)
  expect(validType({foo: 'string'}, {foo: null})).toBe(false)
  expect(validType({foo: 'string'}, {})).toBe(false)

  expect(validType({foo: {bar: 'boolean'}}, {foo: {bar: true}})).toBe(true)
  expect(validType({foo: {bar: 'array'}}, {foo: {bar: []}})).toBe(true)
  expect(validType({foo: {bar: {baz: 'array'}}}, {foo: {bar: {baz: {}}}})).toBe(false)

  expect(validType({foo: 'string'}, {foo: 5})).toBe(false)
  expect(validType({foo: 'string'}, {bar: 'bar'})).toBe(false)
  expect(validType({foo: 'string'}, {})).toBe(false)
  expect(validType({foo: 'string'}, ['bar'])).toBe(false)
})

it('validType - works with array types', () => {
  expect(validType([{foo: 'string'}], [{foo: '5'}])).toBe(true)
  expect(validType([{foo: 'string'}], [{foo: 5}])).toBe(false)
  expect(validType([{foo: 'string'}], [{}])).toBe(false)
  expect(validType([{foo: 'string'}], undefined)).toBe(false)
  expect(validType([{foo: 'string'}], null)).toBe(false)
  expect(validType([{foo: 'string'}], [])).toBe(true)
  expect(validType([{foo: 'string'}], ['bar'])).toBe(false)
  expect(validType([{foo: 'string'}], {foo: 'bar'})).toBe(false)

  expect(validType(['string'], ['foo'])).toBe(true)
  expect(validType(['string'], [null])).toBe(false)
  expect(validType(['string'], [{}])).toBe(false)

  expect(validType(['string'], [])).toBe(true)

  expect(validType([{foo: [{bar: 'boolean'}]}], [{foo: [{bar: true}]}])).toBe(true)
  expect(validType([{foo: [{bar: 'boolean'}]}], [{foo: [{bar: true, baz: 1}]}])).toBe(true)
  expect(validType([{foo: [{bar: 'boolean'}]}], [{foo: [{bar: false}]}])).toBe(true)

  // Handle null and undefined in arrays
  expect(validType([{foo: [{bar: 'boolean'}]}], [{foo: [{bar: false}]}, null])).toBe(false)
  expect(validType([{foo: [{bar: 'boolean'}]}], [{foo: [{bar: false}]}, undefined])).toBe(false)

  expect(validType([{foo: [{bar: 'boolean'}]}], [{foo: [{bar: 'true'}]}])).toBe(false)
  expect(validType([{foo: [{bar: 'boolean'}]}], [{foo: [{bars: true}]}])).toBe(false)
})
