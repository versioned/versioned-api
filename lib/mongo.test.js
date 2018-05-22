const {formatDbError} = require('./mongo')

test('formatDbError - will not transform an error twice (idempotent)', () => {
  const error = {status: 422, errors: [{message: 'Something went wrong'}]}
  expect(formatDbError(error)).toEqual(error)
})

test('formatDbError - formats a DuplicateKey (11000) mongodb error', () => {
  const error = {
    code: 11000,
    errmsg: 'E11000 duplicate key error collection: versioned2_test.users index: email_1 dup key: { : "ae33@example.com" }'
  }
  const expected = {
    status: 422,
    errors: [{type: 'unique', field: 'email', message: 'Duplicate value - must be unique'}]
  }
  expect(formatDbError(error)).toEqual(expected)
})

test('formatDbError - formats a DuplicateKey (11000) mongodb error with dollar sign index', () => {
  const error = {
    code: 11000,
    errmsg: 'E11000 duplicate key error index: versioned2_development.users.$email_-1 dup key: { : "asdfasdf@asdf" }"'
  }
  const expected = {
    status: 422,
    errors: [{type: 'unique', field: 'email', message: 'Duplicate value - must be unique'}]
  }
  expect(formatDbError(error)).toEqual(expected)
})
