const diff = require('lib/diff')

test('returns undefined if two objects are equal', () => {
  expect(diff({}, {})).toEqual(undefined)
  expect(diff({foo: 1}, {foo: 1})).toEqual(undefined)
  expect(diff({foo: 1, bar: [{baz: true}]}, {foo: 1, bar: [{baz: true}]})).toEqual(undefined)
})

test('returns diff object if two objects are not equal', () => {
  expect(diff({foo: 1}, {})).toEqual({foo: {deleted: 1}})
  expect(diff({}, {foo: 1})).toEqual({foo: {added: 1}})
  expect(diff({foo: 1, bar: [true]}, {foo: 2, bar: [true]}))
    .toEqual({foo: {changed: {from: 1, to: 2}}})
  expect(diff({foo: [1, 2], bar: [true]}, {foo: [2, 2], bar: [true]}))
    .toEqual({'foo.0': {changed: {from: 1, to: 2}}})
})

test('can handle addition, deletion, and update in arrays', () => {
  expect(diff({foo: []}, {foo: [1]})).toEqual({'foo.0': {added: 1}})
  expect(diff({foo: [1]}, {foo: []})).toEqual({'foo.0': {deleted: 1}})
  expect(diff({foo: [1]}, {foo: [2]})).toEqual({'foo.0': {changed: {from: 1, to: 2}}})
  expect(diff({foo: [1, 2, 3]}, {foo: [0, 2]}))
    .toEqual({'foo.0': {changed: {from: 1, to: 0}}, 'foo.2': {deleted: 3}})
})

test('can handle addition, deletion, and update in objects', () => {
  expect(diff({}, {foo: 1})).toEqual({'foo': {added: 1}})
  expect(diff({foo: 1}, {})).toEqual({'foo': {deleted: 1}})
  expect(diff({foo: 1}, {foo: 2})).toEqual({'foo': {changed: {from: 1, to: 2}}})
})
