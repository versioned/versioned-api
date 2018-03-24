const u = require('./util')

test('evolve - transforms values in object with matching keys', () => {
  const double = (n) => 2*n
  const upper = (str) => str.toUpperCase()
  const obj = {foo: 1, bar: 'baz', bla: true}
  const transformations = {foo: double, bar: upper, blubba: double}
  const expected = {foo: 2, bar: 'BAZ', bla: true}
  expect(u.evolve(obj, transformations)).toEqual(expected)
})
