const parseUrl = require('url').parse
const parseQuery = require('querystring').parse

module.exports = async function (c) {
  const name = c.uuid()
  const user = {
    name,
    email: `${name}@example.com`,
    password: 'admin'
  }
  let result = await c.post('create user', '/users', user)
  user.id = result.data.id
  c.assert(!result.data.password)
  c.assert(!result.data.forgotPasswordToken)

  result = await c.post('valid login', '/login', user)
  const headers = {authorization: `Bearer ${result.data.token}`}

  await c.post({it: 'Leaving out email yields 422', status: 422}, '/forgot-password/deliver', {}, {headers: {authorization: null}})

  await c.post({it: 'Missing email yields 404', status: 404}, '/forgot-password/deliver', {email: `${c.uuid()}@example.com`}, {headers: {authorization: null}})

  await c.post('Request forgot password email', '/forgot-password/deliver', {email: user.email}, {headers: {authorization: null}})

  result = await c.get('get user - forgotPasswordToken not visible', `/users/${user.id}`, {headers})
  c.assert(!result.data.password)
  c.assert(!result.data.forgotPasswordToken)

  result = await c.get('list emails and check first one', `/emails`, {headers: c.data.superHeaders})
  const emailDoc = result.data[0]
  c.assert(emailDoc)
  c.assertEqual(emailDoc.to, user.email)
  c.assert(!emailDoc.error)

  // NOTE: turns out parseUrl can't handle the anchor in the path
  const url = parseUrl(emailDoc.body.match(/https:\S+/)[0].replace(/\/#\//, '/'))
  const {token, email} = parseQuery(url.query)
  c.assert(token)
  c.assertEqual(email, user.email)

  const password = c.uuid()

  await c.post({it: 'change password without token', status: 422}, '/forgot-password/change', {email, password}, {headers: {authorization: null}})

  await c.post({it: 'change password with missing token', status: 404}, '/forgot-password/change', {token: c.uuid(), email, password}, {headers: {authorization: null}})

  await c.post({it: 'change password with missing email', status: 404}, '/forgot-password/change', {token, email: `${c.uuid()}@example.com`, password}, {headers: {authorization: null}})

  await c.post({it: 'change password with invalid password', status: 422}, '/forgot-password/change', {token, email, password: '1'}, {headers: {authorization: null}})

  await c.post('Login with old password still works', '/login', user)

  await c.post('change password successfully', '/forgot-password/change', {token, email, password}, {headers: {authorization: null}})

  await c.post({it: 'Login with old password does not work', status: 401}, '/login', user)

  await c.post('Login with new password works', '/login', {email: user.email, password})

  await c.post({it: 'cannot change password again with same token', status: 404}, '/forgot-password/change', {token, email, password: c.uuid()}, {headers: {authorization: null}})

  await c.post('Login with new password still works', '/login', {email: user.email, password})
}
