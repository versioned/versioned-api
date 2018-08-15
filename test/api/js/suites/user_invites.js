const {length, pick, property} = require('lib/util')

module.exports = async function (c) {
  const accountId = c.data.account.id

  let result = await c.get('get account', `/accounts/${accountId}`)
  const accountBefore = result.data
  c.assert(accountBefore.users.length > 0)

  const invitedUser = {
    email: 'invitedUser@example.com',
    password: 'foobar',
    role: 'read'
  }
  const invitedUserCredentials = pick(invitedUser, ['email', 'password'])
  result = await c.post('invite new user', `/${accountId}/user_invites`, invitedUser)
  const userInvite = result.data

  await c.get({it: 'get emails as regular user - should not be possible', status: 401}, '/emails')
  result = await c.get('get emails as super user', '/emails', {headers: c.data.superHeaders})
  const email = result.data[0]
  c.assertEqual(email.from, c.data.user.email)
  c.assertEqual(email.to, invitedUser.email)
  c.assertEqual(email.subject, `[Versioned] You have been invited to the ${c.data.account.name} account`)
  const acceptUrlPattern = new RegExp(`https://app.versioned.io/#/accounts/${accountId}/invite-user-accept/${userInvite.id}`)
  c.assert(email.body.match(acceptUrlPattern), `Email body should contain URL ${acceptUrlPattern}`)

  result = await c.post('Create account as new user', '/users', invitedUserCredentials)
  invitedUser.id = result.data.id
  result = await c.post('Log in as new user', '/login', invitedUserCredentials)
  const invitedUserHeaders = {authorization: `Bearer ${result.data.token}`}

  await c.post({it: 'Accept invitation without auth - should not work', status: 401}, `/user-invite-accept/${userInvite.id}`)
  await c.post('Accept invitation as new user', `/user-invite-accept/${userInvite.id}`, {}, {headers: invitedUserHeaders})

  result = await c.get('get account and check number of users and user_invites', `/accounts/${accountId}`)
  const accountAfter = result.data
  c.assertEqual(accountAfter.users.length, accountBefore.users.length + 1)
  c.assert(accountAfter.users.map(property('id')).includes(invitedUser.id))
  c.assertEqual(length(accountAfter.userInvites), length(accountBefore.userInvites))
}
