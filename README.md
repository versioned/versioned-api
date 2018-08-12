# versioned2

A CMS REST API on MongoDB/Node.js - similar to Contentful

## Discussion Points

* Alternative to ajv for schema validation: https://github.com/tdegrunt/jsonschema
* Use bcrypt instead of crypto when it works with latest Node?

## Prerequisites

```
export NODE_PATH=.
```

## Start Dev Server

```
npm run dev
```

## Tests

Run linting, unit tests, and api tests:

```
npm test
```

Quiet mode:

```
LOG_LEVEL=error npm test
```

Verbose mode:

```
LOG_LEVEL=verbose npm test
```

## Connect to Production Mongo

```bash
mongo $(heroku config:get MONGODB_URL)
```

## API Examples

For local/Heroku:

```
export BASE_URL=http://localhost:3000/v1

export BASE_URL=https://versioned2.herokuapp.com/v1
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
echo "{\"name\": \"Published Items\", \"spaceId\": \"${SPACE_ID}\", \"coll\": \"items\", \"features\": [\"published\"], \"model\": {\"schema\": {\"type\": \"object\", \"properties\": {\"title\": {\"type\": \"string\"}, \"key\": {\"type\": \"string\", \"x-meta\": {\"update\": false}}}}}}" | http POST $BASE_URL/$ACCOUNT_ID/models Authorization:"Bearer $TOKEN"
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

## Routes

```javascript
async function printRoutes() {
  const config = require('app/config')
  await config.modules.mongo.connect()

  const {getRoutes} = require('app/routes')
  const {prettyJson} = require('lib/util')
  console.log(prettyJson(await getRoutes()))
}
printRoutes()
```

## Swagger 2.0 Spec Validation

There are compatibility issues between the latest Swagger JSON schema (2.0) and the ajv validator, see: https://www.bountysource.com/issues/44610526-no-schema-with-key-or-ref-http-json-schema-org-draft-04-schema

I tried to migrate the Swagger 2.0 schema for ajv to be able to deal with it:

```
ajv migrate -s public/swagger-2.0-schema.json
```

```
const swaggerSchema = require('public/swagger-2.0-schema')
const swagger = require('public/swagger-example')
const Ajv = require('ajv')
const ajv = new Ajv({allErrors: true})
ajv.compile(swaggerSchema)(swagger)
```

I ended up making manual modifications to the swagger schema, basically remove $refs, to make ajv swallow it.

## OpenAPI 3.0 Spec Validation

Had same $ref issues here with ajv validation as with Swagger 2.0 (see above).

```
const openapiSchema = require('public/openapi-schema')
const openapi = require('public/openapi-example')
const Ajv = require('ajv')
const ajv = new Ajv({allErrors: true})
ajv.compile(openapiSchema)(openapi)
```

## Integer ID Sequence in MongoDB

```javascript
const config = require('app/config')
config.modules.mongo.connect(config.MONGODB_URL)

mongo.nextSequence('foobar').then(console.log) // => {value: { _id: 'foobar', seq: 1 }}
mongo.nextSequence('foobar').then(console.log) // => {value: { _id: 'foobar', seq: 2 }}
```

## Deployment

Using [Apex Up](https://up.docs.apex.sh):

```
up
```

Using Heroku:

```
heroku apps:create versioned2
git push heroku master
```

## JWT

```javascript
const jwt = require('lib/jwt')
const exp = Date.now()/1000 + 3600*24*30
const payload = { foo: 'bar', exp }
// HS256 secrets are typically 128-bit random strings, for example hex-encoded:
const secret = Buffer.from('fe1a1915a379f3be5394b64d14794932', 'hex')
const token = jwt.encode(payload, secret)
const decoded = jwt.decode(token, secret)
console.log(decoded) //=> { foo: 'bar' }
```

## MongoDB

With a promise chain:

```javascript
const config = require('app/config')
async function crudTestPromises() {
  const db = await config.modules.mongo.connect(config.MONGODB_URL)
  const users = db.collection('users')
  const admin = {id:1, email: 'admin@example.com', password: 'admin'}
  users.insert(admin)
    .then(({result}) => {
      console.log('insert result', result)
      return users.find({}).toArray()
    })
    .then((results) => {
      console.log('find results', results)
      return users.updateOne({id: 1}, {$set: {password: 'changed'}})
    })
    .then(({result}) => {
      console.log('update results', result)
      return users.find({}).toArray()
    })
    .then((results) => {
      console.log('find results after update', results)
      return users.remove({id: 1})
    })
    .then(({result}) => {
      console.log('remove results', result)
      return users.find({}).toArray()
    })
    .then((results) => {
      console.log('find results after remove', results)
    })
}
const resultPromises = crudTestPromises()
```

With async functions:

```javascript
const config = require('app/config')
const {uuid} = require('lib/util')
async function crudTestAsync() {
  const db = await config.modules.mongo.connect(config.MONGODB_URL)
  const users = db.collection('users')
  const admin = {id:1, email: `${uuid()}@example.com`, password: 'admin'}
  console.log('insert result', (await users.insert(admin)).result)
  console.log('find results', await users.find({}).toArray())
  console.log('update results', (await users.updateOne({id: 1}, {$set: {password: 'changed'}})).result)
  console.log('find results after update', await users.find({}).toArray())
  console.log('remove results', (await users.remove({id: 1})).result)
  console.log('find results after remove', await users.find({}).toArray())
}
const resultAsync = crudTestAsync()
```

With `lib/db_api`:

```javascript
const config = require('app/config')
config.modules.mongo.connect(config.MONGODB_URL)

const db = mongo.db
const dbApi = require('lib/db_api')(db)
const coll = 'foobar'
dbApi.find(coll, {}).then(console.log)
dbApi.count(coll, {}).then(console.log)
dbApi.create(coll, {id: 1, title: 'bla bla'}).then(console.log)
dbApi.update(coll, {id: 1}, {$set: {title: 'bla bla updated'}}).then(console.log) // result: { n: 1, nModified: 1, ok: 1 }
dbApi.remove(coll, {id: 1}).then(console.log) //  result: { n: 1, ok: 1 }
```

## HTTP Client

```javascript
const client = require('lib/http_client')()
async function get() {
  const result = await client.get('http://www.google.com')
  console.log('client.get result', result)
}
get()
```

## Type Checks of Function Arguments

```javascript
const assertTypes = require('lib/assert_types')
assertTypes([function() {}, 5, true, null], 'function', 'number', 'boolean', 'date?')
assertTypes([{foo: function() {}}, 5, 'foobar', new Date()], {foo: 'function'}, 'number', 'string', 'date?')
assertTypes([{foo: 1, bar: 'baz'}], {foo: 'number', bar: 'string'})

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
