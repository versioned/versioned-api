const {pick, merge} = require('lib/util')

module.exports = async function (c) {
  const accountId = c.data.account.id
  const user = c.data.user

  let result = await c.post('create space for relationships types test', `/${accountId}/spaces`, {name: 'Relationships Types Test', accountId: accountId})
  const spaceId = result.data.id

  const Widget = {
    name: 'Widget',
    spaceId: spaceId,
    model: {
      schema: {
        type: 'object',
        properties: {
          title: {type: 'string'},
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {type: 'string'},
                type: {type: 'string'}
              },
              additionalProperties: false,
              required: ['id', 'type']
            },
            'x-meta': {
              relationship: {
                type: 'one-to-many'
              }
            }
          }
        },
        required: ['title'],
        additionalProperties: false
      }
    }
  }

  const Article = {
    name: 'Article',
    spaceId: spaceId,
    model: {
      schema: {
        type: 'object',
        properties: {
          title: {type: 'string'}
        },
        required: ['title'],
        additionalProperties: false
      }
    }
  }

  const BlogPost = {
    name: 'BlogPost',
    spaceId: spaceId,
    model: {
      schema: {
        type: 'object',
        properties: {
          title: {type: 'string'}
        },
        required: ['title'],
        additionalProperties: false
      }
    }
  }

  const models = [Widget, Article, BlogPost]

  for (let model of models) {
    result = await c.post(`create ${model.name} model`, `/${spaceId}/models`, model)
    model.coll = result.data.coll
    model.id = result.data.id
  }

  result = await c.post('create an article', `/data/${spaceId}/${Article.coll}`, {title: 'First Article'})
  const article = result.data

  result = await c.post('create a blog post', `/data/${spaceId}/${BlogPost.coll}`, {title: 'First Blog Post'})
  const blogPost = result.data

  const items = [article, blogPost].map(doc => pick(doc, ['type', 'id']))
  result = await c.post('create a widget with relationship to article and blog post', `/data/${spaceId}/${Widget.coll}`, {
    title: 'First Widget',
    items
  })
  const widget = result.data

  result = await c.get('fetch the widget with relationships', `/data/${spaceId}/${Widget.coll}/${widget.id}?relationshipLevels=1`)
  c.assertEqual(result.data.items.length, 2)
  c.assertEqualKeys(['id', 'title', 'type'], result.data.items[0], article)
  c.assertEqualKeys(['id', 'title', 'type'], result.data.items[1], blogPost)
  c.assertEqualKeys(['id', 'name', 'email', 'createdAt'], result.data.createdBy, user)
  c.assertEqualKeys(['id', 'name', 'email', 'createdAt'], result.data.updatedBy, user)

  await c.put({it: 'you cannot put an invalid id in the relationship', status: 422}, `/data/${spaceId}/${Widget.coll}/${widget.id}`, merge(widget, {items: [
    {id: 'this-id-does-not-exist', type: Article.coll}
  ]}))

  await c.put({it: 'you cannot put an invalid type in the relationship', status: 422}, `/data/${spaceId}/${Widget.coll}/${widget.id}`, merge(widget, {items: [
    {id: article.id, type: 'this-type-does-not-exist'}
  ]}))

  await c.put({it: 'you cannot put a missing id in the relationship', status: 422}, `/data/${spaceId}/${Widget.coll}/${widget.id}`, merge(widget, {items: [
    {type: Article.coll}
  ]}))

  await c.put({it: 'you cannot put a missing type in the relationship', status: 422}, `/data/${spaceId}/${Widget.coll}/${widget.id}`, merge(widget, {items: [
    {id: article.id}
  ]}))
}
