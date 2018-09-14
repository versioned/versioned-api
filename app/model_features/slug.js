const {urlFriendly, merge, notEmpty, keys, filter, getIn} = require('lib/util')
const {titleProperty} = require('lib/model_meta')

function slugProperties (model) {
  return keys(filter(getIn(model, 'schema.properties'), (p) => getIn(p, 'x-meta.slug')))
}

function initSlugFields (doc, options) {
  const slugs = {}
  for (let property of slugProperties(options.model)) {
    const fromProperty = titleProperty(options.model)
    if (fromProperty) slugs[property] = urlFriendly(doc[property] || doc[fromProperty])
  }
  if (notEmpty(slugs)) {
    return merge(doc, slugs)
  }
}

function sluggifyFields (doc, options) {
  const slugs = {}
  for (let property of slugProperties(options.model)) {
    slugs[property] = urlFriendly(doc[property])
  }
  if (notEmpty(slugs)) {
    return merge(doc, slugs)
  }
}

const model = {
  callbacks: {
    create: {
      beforeValidation: [initSlugFields]
    },
    update: {
      beforeValidation: [sluggifyFields]
    }
  }
}

module.exports = model
