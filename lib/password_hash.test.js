const passwordHash = require('./password_hash')

test('generate/verify - you can generate a hash and then verify it', async () => {
  const password = 'open sesame'
  const hash = await passwordHash.generate(password)
  const verified = await passwordHash.verify(password, hash)
  expect(verified).toBe(true)
})
