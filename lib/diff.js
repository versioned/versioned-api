const {empty, concat, append, difference, intersection, range, merge} = require('lib/util')

function pathString (path) {
  if (path.length === 0) return ''
  let result = path[0]
  path.slice(1).forEach(key => {
    if (!key.match(/\[\d+\]$/)) result += '.'
    result += key
  })
  return result
}

function valueType (value) {
  if (value === undefined) {
    return 'undefined'
  } else if (value === null) {
    return 'null'
  } else if (Array.isArray(value)) {
    return 'array'
  } else {
    // object, string, number, boolean
    return typeof value
  }
}

// Diff two JSON type objects. Examples:
// _diff({foo: 'bar'}, {foo: 'baz'}, [])
//   { foo: { change: { from: 'bar', to: 'baz' } } }
//
// _diff({a: {foo: true}}, {a: {foo: 'baz', bar: 1}}, [])
//   { 'a.bar': { add: 1 },
//    'a.foo':
//    { change: { from: true, to: 'baz' },
//      type_change: { from: 'boolean', to: 'string' } } }
// _diff({a: {foo: [true, 'b', 'c']}}, {a: {foo: ['baz', 'b', 'c', 'd'], bar: 1}}, [])
// _diff({a: {foo: [true, 'b', 'c']}}, {a: {foo: ['baz', 'b'], bar: 1}}, [])
function _diff (v1, v2, path) {
  const t1 = valueType(v1)
  const t2 = valueType(v2)
  if (t1 !== t2) {
    return {
      [pathString(path)]: {
        changed: {
          from: v1,
          to: v2
        },
        type_changed: {
          from: t1,
          to: t2
        }
      }
    }
  }
  if (t1 === 'array') {
    let arrayDiffs = []
    if (v1.length > v2.length) {
      // deleted items
      arrayDiffs = range(v2.length, v1.length).map((index) => {
        return {
          [pathString(append(path, `[${index}]`))]: {deleted: v1[index]}
        }
      })
    } else if (v1.length < v2.length) {
      // added items
      arrayDiffs = range(v1.length, v2.length).map((index) => {
        return {
          [pathString(append(path, `[${index}]`))]: {added: v2[index]}
        }
      })
    }
    // changed items
    const diffLength = Math.min(v1.length, v2.length)
    arrayDiffs = concat(arrayDiffs, range(0, diffLength).map((index) => {
      return _diff(v1[index], v2[index], append(path, `[${index}]`))
    }))
    return arrayDiffs.reduce(merge, {})
  } else if (t1 === 'object') {
    const keys1 = Object.keys(v1)
    const keys2 = Object.keys(v2)
    const addDiffs = difference(keys2, keys1).map((key) => {
      return {
        [pathString(append(path, key))]: {added: v2[key]}
      }
    })
    const deleteDiffs = difference(keys1, keys2).map((key) => {
      return {
        [pathString(append(path, key))]: {deleted: v1[key]}
      }
    })
    const changeDiffs = intersection(keys1, keys2).map((key) => {
      return _diff(v1[key], v2[key], append(path, key))
    })
    return concat(addDiffs, deleteDiffs, changeDiffs).reduce(merge, {})
  } else {
    if (v1 !== v2) {
      return {
        [pathString(path)]: {
          changed: {
            from: v1,
            to: v2
          }
        }
      }
    } else {
      return {}
    }
  }
}

function diff (fromObj, toObj) {
  const result = _diff(fromObj, toObj, [])
  return empty(result) ? undefined : result
}

module.exports = diff
