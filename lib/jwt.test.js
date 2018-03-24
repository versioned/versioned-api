const jwt = require('./jwt')

test('if you encode a payload you get it back with decode', () => {
  const payload = { foo: 'bar' }
  // HS256 secrets are typically 128-bit random strings, for example hex-encoded:
  const secret = Buffer.from('fe1a1915a379f3be5394b64d14794932', 'hex')
  const token = jwt.encode(payload, secret)
  const decoded = jwt.decode(token, secret)
  expect(decoded).toEqual(payload)
})
