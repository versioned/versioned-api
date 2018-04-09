module.exports = async function (c) {
  // TODO: setup creates space
  // TODO: create model
  // TODO: create model again

  // let result = await c.post('create space', '/spaces', {name: 'My CMS'})
  // let space = result.data.key
  //
  // const model = {
  //   title: 'Article',
  //   space,
  //   model: {
  //     coll: 'articles',
  //     schema: {
  //       type: 'object',
  //       properties: {
  //         title: {type: 'string'},
  //         body: {type: 'string'}
  //       },
  //       required: ['title'],
  //       additionalProperties: false
  //     }
  //   }
  // }
  //
  // await crudTest(c, '', 'models', model, {title: 'Article changed'})
  //
  // result = await c.post('create articles model', '/models', model)
  // const modelId = result.data.id
  //
  // const article = {
  //   title: 'My first article',
  //   body: 'Welcome to my blog!'
  // }
  // const updateArticle = {
  //   title: 'Title changed'
  // }
  // await crudTest(c, `/data/${space}`, 'articles', article, updateArticle)
  //
  // const modelUpdated = setIn(model, ['model', 'schema', 'properties'], {title: {type: 'string'}, slug: {type: 'string'}})
  // await c.put('update articles model with new schema property', `/models/${modelId}`, modelUpdated)
  //
  // const anotherArticle = {
  //   title: 'My second article',
  //   slug: 'my-second-article'
  // }
  // await c.post('create another article with new property', `/data/${space}/articles`, anotherArticle)
  //
  // await c.delete('delete articles model', `/models/${modelId}`)
  //
  // const thirdArticle = {
  //   title: 'My third article',
  //   slug: 'my-third-article'
  // }
  // await c.post({it: 'trying to create an article without model', status: 404}, `/data/${space}/articles`, thirdArticle)
}
