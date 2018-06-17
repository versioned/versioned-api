const {getPublishEvent} = require('./publish_helper')

test('getPublishEvent - returns one of first-publish/republish/publish-change/unpublish', () => {
  expect(getPublishEvent('create', {}, {})).toEqual(undefined)

  expect(getPublishEvent('create', {}, {version: 1, publishedVersion: 1})).toEqual('first-publish')
  expect(getPublishEvent('create', {}, {version: 1})).toEqual(undefined)
  expect(getPublishEvent('update', {}, {version: 1, publishedVersion: 1})).toEqual('first-publish')
  expect(getPublishEvent('update', {firstPublishedAt: '2018-05-10'}, {version: 1, publishedVersion: 1})).toEqual('republish')
  expect(getPublishEvent('update', {firstPublishedAt: '2018-05-10', version: 1, publishedVersion: 1}, {firstPublishedAt: '2018-05-10', version: 2, publishedVersion: 2})).toEqual('publish-change')
  expect(getPublishEvent('update', {firstPublishedAt: '2018-05-10', version: 1, publishedVersion: 1}, {version: 1})).toEqual('unpublish')
})
