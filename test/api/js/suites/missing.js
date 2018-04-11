module.exports = async function (c) {
  await c.get({it: 'getting path that doesnt exist anonymous', status: 404}, '/this/path/does/not/exist', c.anonymous)
  await c.get({it: 'getting path that doesnt exist with auth', status: 404}, '/this/path/does/not/exist')
}
