const {formatDbError} = require('./mongo')

const model = {
  type: 'articles',
  schema: {
    type: 'object',
    properties: {
      title: {type: 'string'}
    }
  }
}

const doc = {title: 'foobar'}

test('formatDbError - will not transform an error twice (idempotent)', () => {
  const error = {status: 422, errors: [{message: 'Something went wrong'}]}
  expect(formatDbError(model, doc, error)).toEqual(error)
})

test('formatDbError - formats a DuplicateKey (11000) mongodb error', () => {
  const error = {
    code: 11000,
    errmsg: 'E11000 duplicate key error collection: versioned2_test.users index: email_1 dup key: { : "ae33@example.com" }'
  }
  const expected = [{field: 'email', message: 'already exists (must be unique)'}]
  expect(formatDbError(model, doc, error).errors).toEqual(expected)
})

test('formatDbError - formats a DuplicateKey (11000) mongodb error with dollar sign index', () => {
  const error = {
    code: 11000,
    errmsg: 'E11000 duplicate key error index: versioned2_development.users.$email_-1 dup key: { : "asdfasdf@asdf" }"'
  }
  const expected = [{field: 'email', message: 'already exists (must be unique)'}]
  expect(formatDbError(model, doc, error).errors).toEqual(expected)
})
