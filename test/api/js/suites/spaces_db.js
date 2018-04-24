const {merge} = require('lib/util')
const config = require('app/config')

module.exports = async function (c) {
  const space = {
    name: 'My Dedicated CMS',
    databaseUrl: `${config.MONGODB_URL}_dedicated`
  }

  await c.post({it: 'create space with invalid databaseUrl', status: 422}, '/spaces', merge(space, {databaseUrl: 'foobar'}))

  let result = await c.post('create space with valid databaseUrl', '/spaces', space)
  c.assert(result.data)
}
