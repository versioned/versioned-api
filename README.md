# Versioned REST API

A CMS REST API on MongoDB and Node.js.

## Documentation

Documenation is available at [versioned-doc](https://github.com/versioned/versioned-doc)

## Installation

```
export NODE_PATH=.
yarn install
```

## Start Dev Server

```
LOG_LEVEL=verbose yarn run dev
```

## Tests

Run linting, unit tests, and api tests:

```
yarn test
```

Quiet mode:

```
LOG_LEVEL=error yarn test
```

Verbose mode:

```
LOG_LEVEL=verbose yarn test
```

## API Examples

```
export BASE_URL=http://localhost:3000/v1
```

Create user:

```
echo '{"name": "Admin User", "email": "admin@example.com", "password": "admin"}' | http POST $BASE_URL/users
export USER_ID=...
```

Make super user:

```
mongo versioned2_development
db.users.update({_id: '$USER_ID'}, {$set: {superUser: true}})
```

Login:

```bash
echo '{"email": "admin@example.com", "password": "admin"}' | http POST $BASE_URL/login
export TOKEN=...
```

Create account:

```
echo '{"name": "My CMS"}' | http POST $BASE_URL/accounts Authorization:"Bearer $TOKEN"
export ACCOUNT_ID=...
export SPACE_ID=...
```

Create Published Model in Space:

```
echo "{\"name\": \"Published Items\", \"spaceId\": \"${SPACE_ID}\", \"coll\": \"items\", \"features\": [\"published\"], \"model\": {\"schema\": {\"type\": \"object\", \"properties\": {\"title\": {\"type\": \"string\"}, \"key\": {\"type\": \"string\", \"x-meta\": {\"update\": false}}}}}}" | http POST $BASE_URL/$SPACE_ID/models Authorization:"Bearer $TOKEN"
```

Create some content for that model:

```
http POST $BASE_URL/data/$SPACE_ID/items Authorization:"Bearer $TOKEN" title="My first item"
```

List content:

```
http $BASE_URL/data/$SPACE_ID/items Authorization:"Bearer $TOKEN"
http "$BASE_URL/data/$SPACE_ID/items?published=1" Authorization:"Bearer $TOKEN"
```

Get account:

```
http $BASE_URL/accounts/$ACCOUNT_ID?relationshipLevels=1 Authorization:"Bearer $TOKEN"
```

Get spaces:

```
http $BASE_URL/$ACCOUNT_ID/spaces?relationshipLevels=1 Authorization:"Bearer $TOKEN"
```

Get user:

```
http $BASE_URL/users/$USER_ID?relationshipLevels=2 Authorization:"Bearer $TOKEN"
```

Set defaultSpaceId for user:

```
echo "{\"defaultSpaceId\": \"$SPACE_ID\"}" | http PUT $BASE_URL/users/$USER_ID Authorization:"Bearer $TOKEN"

http $BASE_URL/users/$USER_ID?relationshipLevels=2 Authorization:"Bearer $TOKEN"
```

Import content:

```
echo '{"docs": [{"title": "foo"}, {"title": "bar"}]}' | http post $BASE_URL/data/$SPACE_ID/import/items Authorization:"Bearer $TOKEN"
```

## Other API Calls

Create a bunch of users:

```
export BASE_URL=http://localhost:3000/v1
while [ 1 ]; do echo "{\"name\": \"Admin User\", \"email\": \"$(uuid)@example.com\", \"password\": \"admin\"}" | http POST $BASE_URL/users; done
```

## Create Admin User from JavaScript

```javascript
async function createAdmin() {
  const config = require('app/config')
  await config.modules.mongo.connect()

  const users = require('app/models/users')
  const doc = {name: 'Admin User', email: 'admin@example.com', password: 'admin'}
  users.create(doc).then(console.log)
  users.get({email: doc.email}).then(console.log)
}
createAdmin()
```

## Deployment

Using [Apex Up](https://up.docs.apex.sh):

```
up
```

Using Heroku:

```
heroku apps:create my-awesome-cms
git push heroku master
```

## Resources

* [node-mongodb-native](https://github.com/mongodb/node-mongodb-native)
* [json-schema-ref-parser](https://www.npmjs.com/package/json-schema-ref-parser)
* [Converting your Swagger 2.0 API Definition to OpenAPI 3.0](https://blog.runscope.com/posts/tutorial-upgrading-swagger-2-api-definition-to-openapi-3)
* [OpenAPI - Add support for patternProperties in schemas](https://github.com/OAI/OpenAPI-Specification/issues/687)

* [Contentful and Netlify: The Dynamic Duo of Static Site Management](https://dev.to/milkstarz/contentful-and-netlify-the-dynamic-duo-of-static-site-management-55i)

* [Beyond Headless CMS: The opportunity is greater than technical architecture](https://prismic.io/beyond-headless-cms)

## Headless CMS - Concepts

"The headless CMS is a back-end only content management system which provides the RESTful API which can be used to build any front-end around. The number of options in terms of languages or frameworks is unlimited."

* [Introduction to the Headless CMS](https://edvins.io/introduction-to-the-headless-cms)

## Headless CMS - Open Source

* [HeadlessCMS.org](https://headlesscms.org)
* [Directus (PHP/MySQL)](https://getdirectus.com)
* [Strapi](https://strapi.io)
* [GraphCMS](https://graphcms.com)
* [Prisma](https://github.com/graphcool/prisma)

Can work in headless mode:

* Wordpress
* Drupal

## Headless CMS - Services (SaaS)

"A headless CMS allows you to provide content to any channel and device through an API."

* [How to Choose a SaaS CMS: The 9-Point Checklist](https://www.coredna.com/blogs/how-to-choose-a-saas-cms)
* [HeadlessCMS.org](https://headlesscms.org)
* [Contentful: Content Infrastructure for Digital Teams](https://www.contentful.com)
* [Comfortable](https://comfortable.io)
* [Prismic: Headless API CMS for both developers and marketers](https://prismic.io)
* [Cloud CMS: Headless CMS and Cloud Content API](https://www.cloudcms.com)
* [Kentico Cloud](https://kenticocloud.com)

* [Contentful Case Study: TUI Nordic](https://www.contentful.com/blog/2017/10/06/stockholm-user-meetup)

## Static Site Generators

* [Gatsby](https://github.com/gatsbyjs/gatsby)
* [Nuxt](https://github.com/nuxt/nuxt.js)
* [Hugo](https://github.com/gohugoio/hugo)

## Image Services

* [Aviary vs. Cloudinary vs. imgix](https://stackshare.io/stackups/aviary-vs-cloudinary-vs-imgix)
