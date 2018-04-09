module.exports = async function (c) {
  // Create a space where models can live
  let result = await c.post('create space', '/spaces', {name: 'My CMS'})
  console.log('pm debug space', result.data)
  let space = result.data.key

  // Create a simple model
  const model = {
    name: 'Article',
    space,
    model: {
      coll: 'articles',
      schema: {
        type: 'object',
        properties: {
          title: {type: 'string'},
          body: {type: 'string'}
        },
        required: ['title'],
        additionalProperties: false
      }
    }
  }
  await c.post('create articles model', '/models', model)

  // CRUD with that content type
  const article = {
    title: 'My first article',
    body: 'Welcome to my blog!'
  }
  await c.post('create article', `/docs/${space}_articles`, article)

  // Delete content type

  // The routes are no longer there

  // TODO: models_validation.js - check that you cannot use invalid coll etc.
}
