const {getIn} = require('lib/util')

function getPublishEvent (action, existingDoc, toDoc) {
  if (!getIn(toDoc, 'version')) return undefined
  const publishedVersionChange = (getIn(toDoc, 'publishedVersion') !== getIn(existingDoc, 'publishedVersion'))
  if (action === 'create' && getIn(toDoc, 'publishedVersion')) {
    return 'first-publish'
  } else if (action === 'update' && getIn(toDoc, 'publishedVersion') && !getIn(existingDoc, 'publishedVersion') && !getIn(existingDoc, 'firstPublishedAt')) {
    return 'first-publish'
  } else if (action === 'update' && getIn(toDoc, 'publishedVersion') && !getIn(existingDoc, 'publishedVersion') && getIn(existingDoc, 'firstPublishedAt')) {
    return 'republish'
  } else if (action === 'update' && publishedVersionChange && getIn(toDoc, 'publishedVersion') && getIn(existingDoc, 'publishedVersion')) {
    return 'publish-change'
  } else if (action === 'update' && publishedVersionChange && !getIn(toDoc, 'publishedVersion') && getIn(existingDoc, 'publishedVersion')) {
    return 'unpublish'
  } else {
    return undefined
  }
}

module.exports = {
  getPublishEvent
}
