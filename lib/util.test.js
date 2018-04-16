const u = require('./util')

test('evolve - transforms values in object with matching keys', () => {
  const double = n => 2 * n
  const upper = (str) => str.toUpperCase()
  const obj = {foo: 1, bar: 'baz', bla: true}
  const transformations = {foo: double, bar: upper, blubba: double}
  const expected = {foo: 2, bar: 'BAZ', bla: true}
  expect(u.evolve(obj, transformations)).toEqual(expected)
})

test('mapObj - map over the values of an object and return a new object (reduce)', () => {
  const obj = {
    foo: 1,
    bar: 2
  }
  const expected = {
    foo: 3,
    bar: 3
  }
  const transform = (key, value) => key === 'foo' ? value + 2 : value + 1
  expect(u.mapObj(obj, transform)).toEqual(expected)
})

test('zip - zips a list of arrays together', () => {
  const arrays = [[5, 3], [6, 7], [8, 2]]
  const expected = [
    [5, 6, 8],
    [3, 7, 2]
  ]
  expect(u.zip(arrays)).toEqual(expected)
})

test('zip - works for a single array', () => {
  expect(u.zip([[4], [3], [2]]))
    .toEqual([[4, 3, 2]])
})

test('zipMap - creates an object out of an array of keys and an array of values', () => {
  expect(u.zipObj(['foo', 'bar', 'baz'], [1, null, 'hello']))
    .toEqual({foo: 1, bar: null, baz: 'hello'})
})

test('concat - takes a number of arrays and concatenates them', () => {
  expect(u.concat()).toEqual([])
  expect(u.concat([])).toEqual([])
  expect(u.concat([], [])).toEqual([])
  expect(u.concat(['a', 'b'], ['c'], [], ['d'])).toEqual(['a', 'b', 'c', 'd'])
})

test('flatten - removes one level from nested array', () => {
  expect(u.flatten([['a', 'b'], ['c'], [], ['d']])).toEqual(['a', 'b', 'c', 'd'])
})

test('reverse - takes an array and creates a new array with the values in reverse order', () => {
  const array = ['foo', 'bar', 'baz']
  expect(u.reverse(array)).toEqual(['baz', 'bar', 'foo'])
  expect(array).toEqual(['foo', 'bar', 'baz'])
})

test('property - takes the name of a property and returns a function that given an object returns the value of that property', () => {
  expect([{name: 'foo'}, {name: 'bar'}].map(u.property('name')))
    .toEqual(['foo', 'bar'])
})

test('groupBy - takes an array and a groupBy function and returns an object where the keys are groupBy return values and the values are corresponding arrays of values', () => {
  const isEven = (value) => value % 2 === 0
  expect(u.groupBy([3, 6, 8, 9], isEven))
    .toEqual({'true': [6, 8], 'false': [3, 9]})
})

test('pick - takes an object and an array of array of property names and returns a new object with only the those properties', () => {
  expect(u.pick({foo: 1, bar: 2, baz: 3}, ['foo', 'baz']))
    .toEqual({foo: 1, baz: 3})
})

test('nil takes a value and returns true if value is null or undefined and true otherwise', () => {
  [null, undefined].forEach((value) => {
    expect(u.nil(value)).toEqual(true)
    expect(u.notNil(value)).toEqual(false)
  })

  const notNilValues = [0, '', 5.2, 'foobar', [], {}, new Date()]
  notNilValues.forEach((value) => {
    expect(u.nil(value)).toEqual(false)
    expect(u.notNil(value)).toEqual(true)
  })
})

test('getIn - takes an object and one or more property names (path) and returns the nested value in the object at given path or undefined', () => {
  expect(u.getIn({foo: {bar: [3, 5]}}, ['foo'])).toEqual({bar: [3, 5]})
  expect(u.getIn({foo: {bar: [3, 5]}}, ['foo', 'bar'])).toEqual([3, 5])
  expect(u.getIn({foo: {bar: [3, 5]}}, ['foo', 'bar', 0])).toEqual(3)
  expect(u.getIn({foo: {}}, ['foo', 'bar'])).toEqual(undefined)
  expect(u.getIn({}, ['foo', 'bar'])).toEqual(undefined)
  expect(u.getIn(null, ['foo', 'bar'])).toEqual(undefined)
})

test('setIn - takes an object, a path, and a value and sets the value at the given path in the object', () => {
  const obj = {foo: {bar: 2}}
  expect(u.setIn(obj, ['foo'], null)).toEqual({foo: null})
  expect(obj).toEqual({foo: {bar: 2}})
  expect(u.setIn(obj, ['foo'], 1)).toEqual({foo: 1})
  expect(u.setIn(obj, ['foo', 'bar'], 1)).toEqual({foo: {bar: 1}})
  expect(u.setIn({}, ['foo', 'bar'], 1)).toEqual({foo: {bar: 1}})
  expect(u.setIn(null, ['foo', 'bar'], 1)).toEqual({foo: {bar: 1}})
})

test('safeCall - catches error raised by function invocation and returns fallback value', () => {
  expect(u.safeCall(JSON.parse, [])).toEqual(undefined)
  expect(u.safeCall(JSON.parse, [], 'fallback')).toEqual('fallback')
  expect(u.safeCall(JSON.parse, ['{"foo": 1}'])).toEqual({foo: 1})
})

test('merge - takes two objects and returns a new object which is the first object merged with the second', () => {
  const toObj = {foo: 1, bar: 2}
  const fromObj = {foo: 2, baz: 4}
  expect(u.merge(toObj, fromObj)).toEqual({foo: 2, bar: 2, baz: 4})
  expect(toObj).toEqual({foo: 1, bar: 2})
  expect(fromObj).toEqual({foo: 2, baz: 4})
  expect(u.merge(null, null)).toEqual({})
  expect(u.merge({foo: 1, bar: 2}, {bar: null})).toEqual({foo: 1, bar: null})
})

test('deepMerge - takes two objects and returns a new object which is the first object deep merged with the second', () => {
  const toObj = {
    a: {
      a: 1,
      b: 2,
      c: 3
    },
    b: 2,
    c: {d: 1}
  }
  const fromObj = {
    a: {
      a: 2,
      d: 4
    },
    c: 4,
    d: 5
  }
  const expected = {
    a: {
      a: 2,
      b: 2,
      c: 3,
      d: 4
    },
    b: 2,
    c: 4,
    d: 5
  }
  expect(u.deepMerge(toObj, fromObj)).toEqual(expected)
  expect(u.deepMerge(null, null)).toEqual({})
})

test('deepMergeConcat - does a deep merge with concatenation of arrays', () => {
  const toObj = {
    a: {
      a: 1,
      b: 2,
      c: 3,
      e: [4]
    },
    b: 2,
    c: {d: 1},
    e: 6
  }
  const fromObj = {
    a: {
      a: 2,
      d: 4,
      e: [5]
    },
    c: 4,
    d: 5,
    e: [7]
  }
  const expected = {
    a: {
      a: 2,
      b: 2,
      c: 3,
      d: 4,
      e: [4, 5]
    },
    b: 2,
    c: 4,
    d: 5,
    e: [7]
  }
  expect(u.deepMergeConcat(toObj, fromObj)).toEqual(expected)
  expect(u.deepMergeConcat(null, null)).toEqual({})
})

test('range - takes two args - a from integer and a to integer (inclusive-exlusive) and returns the range of ints between them', () => {
  expect(u.range(4, 6)).toEqual([4, 5])
})

test('empty - checks for null/undefined and empty arrays, strings, and objects', () => {
  const emptyValues = [
    null,
    undefined,
    [],
    '',
    {}
  ]
  for (let value of emptyValues) {
    expect(u.empty(value)).toBe(true)
  }
  const nonEmptyValues = [
    function () {},
    new Date(),
    false,
    5,
    'foobar',
    {foo: 1},
    ['']
  ]
  for (let value of nonEmptyValues) {
    expect(u.empty(value)).toBe(false)
  }
})

test('compact - removes empty/nil values from nested arrays and objects', () => {
  const obj = {
    foo: {
      bar: [null, 3],
      baz: {}
    },
    bar: null,
    bla: '',
    baz: false,
    blubba: {
      foo: {
        bar: []
      }
    }

  }
  const objExpect = {
    foo: {
      bar: [3]
    },
    baz: false
  }
  const fn = function () {}
  const date = new Date()
  const array = [null, [], 2, 'foobar', [obj], fn, date]
  const arrayExpect = [2, 'foobar', [objExpect], fn, date]
  expect(u.compact(obj)).toEqual(objExpect)
  expect(u.compact(array)).toEqual(arrayExpect)
})

test('compact - deals with empty', () => {
  expect(u.compact([])).toEqual([])
  expect(u.compact([''])).toEqual([])
  expect(u.compact([[]])).toEqual([])
  expect(u.compact({})).toEqual({})
  expect(u.compact({foo: {}})).toEqual({})
  expect(u.compact({foo: []})).toEqual({})
  const emptyValues = [
    null,
    undefined,
    ''
  ]
  for (let value of emptyValues) {
    expect(u.compact(value)).toBe(undefined)
  }
  const nonEmptyValues = [
    function () {},
    new Date(),
    false,
    5,
    'foobar',
    {foo: 1},
    ['foo']
  ]
  for (let value of nonEmptyValues) {
    expect(u.compact(value)).toEqual(value)
  }
})
