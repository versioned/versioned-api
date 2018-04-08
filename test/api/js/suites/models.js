module.exports = async function (c) {
  // Create a simple model
  const model = {
    name: 'Article',
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
  await c.post('create articles model', '/sys_models', model)

  // CRUD with that content type

  // Delete content type

  // The routes are no longer there

  // TODO: models_validation.js - check that you cannot use invalid coll etc.
}
