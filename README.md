# versioned2

A CMS REST API on MongoDB/Node.js - similar to Contentful

## TODO

* API test: relationships_update.js - update/delete/add from four rel types
  Use new models?

* relationshipPaths=foo.bar,blu.baa

* API test: Support fetching multiple levels of relationships (you can pass options={relationships: (N-1)})

* You could publish two way rel changes if there are no other changes

* API test a relationship with state (categories.weight)

* Remove fromType or set it automatically?

* API test validation in models_relationships_validate (or add it in models_relationships for now?)

* The list endpoint needs to avoid N+1 problem when fetching relationships

* When changes to relationships are published then the docs at the other side of those relationships
  also need to be published in order for the relationships to be in sync two-way

* The get/list functions need to fetch relationships when relationships=1 is
  provided.

* After update/create any changes to the relationship needs to be reflected on the other
  side of the relationship if toField is set (if it's two way)

* After delete the other side of the relationship needs to be updated if toField is set

* When creating model with x-meta.relationship.toField then the opposite
  end of the relationship needs to be set up as a property in the toType model
  Need to handle likely case that the other model doesn't exist yet.

* Support relationships with state? I.e. accounts-users with role

* Handle or prevent updates/changes of relationships

* published needs to fetch published versions of relationships if queryParams.relationships and relationshipProperties

* Two way relationships
  owning side of relationship:
  one-to-one
  many-to-many
  many-to-one
  one-to-many

* versioned2-ui

* Change to yarn for consistency with UI?

* Try MongoDB Stitch https://www.mongodb.com/cloud/stitch?jmp=hero

* accessCheck - API test
  users can only update/delete/get self
  accounts can only be updated/deleted by admin

* API test account scoping in model_controller of models and spaces

* Deletion of accounts. Disallow if there are users connected? Clear out relationships?

* accounts API test that checks user relationship and permissions

* Double check permission per role
  Ability to create spaces?

* Documentation index page with links to main swagger and data swagger per space

* Load test 1000 spaces and lots of data. How much memory is consumed?
  Need a sync/import endpoint

* Need to drop ${config.MONGODB_URL}_dedicated in API tests? - Introduce c.MONGODB_URL_DEDICATED?

* Should rename _id to id when we read the doc from mongo
  Need to rename version coll id for this to work.

* Rename /data to /content ("Add Content")?

* Deal with empty content for required fields - api test

* Preview feature - version, versionToken
  models.previewUrl - http://my.site/articles/{id}
  Need to support slug also?

* Translate feature. There can be a spaces.locales setting with [{locale: 'sv', name: 'Swedish', default: true}]
    have a fallbackLocale param?
    locale is "two-letter (639-1) or three-letter (639-2 and 639-3)"
    https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
    x-meta: translated: true
    {
        :type "object"
        :x-meta {
          :translated true
        }
        :properties makeObj(space.locales, () => {type: 'string'})
        :additionalProperties false
    }
    translated model feature
      locale query param for get/list - will transform objects to strings based on locale
      If no locale is provided we use the default

* Maybe we should not create a new changelog entry but instead update the last one if there is already a recent update for the same id (and version if the model is published). This will be especially important with autosave.

* Need archiving? Contentful events: create, save, autosave, archive, unarchive, publish, unpublish, delete.

* Don’t allow deletion of model with content

* Relationship - many references, ordered list (array). UI is search plus add
  References are restricted to one or more types

* Ability to disable a field
  Cannot delete field for model with content? Or need to disable before you delete.

* Need to support images and other files (assets). Use service?

* models.model should have update: false? You can do this by introducing models.schema and a setSchema callback (or have a setModel callback for coll, features, schema etc.)

* Move spaceId from path to header?

* Relationships

* Try always throwing Error objects
  Better error logging from middleware

* swagger suite API test request/response schemas (update/create etc.)

* api test list endpoint parameters. Validation of list params. Which fields can you query by and which can you sort by? Only query indexes fields if the collection is large?

* Put space_id in header instead of in path?

* Contentful data types and constraints (short text, long text)

* Rename swagger to openapi?

* list endpoint improvements
  stats optional via query param
  always add count instead
  make sure count always uses the same query as list

* Study contentful

* Multi tenant: accounts model (users.account_id)
* Multi tenant: spaces model with (account_id, name, key)

## Launch

* USP
  * Direct database access and data scalability

* Domain (dnsimple)
  www.versioned.io
  app.versioned.io
  api.versioned.io
* Name
* Logo
* Look and feel
* Sale site at www.versioned.io
* UI at app.versioned.io
* API at api.versioned.io
* Heroku addon?
* Demo app, see: https://www.contentful.com/developers/docs/ruby/tutorials/full-stack-getting-started/
  https://www.contentful.com/developers/docs/ruby/example-apps

## Discussion Points and Backlog

* Support Webhooks
  Use SQS and Lambda? Need to support many consumers.
  MongoDB Stitch has webhooks? https://docs.mongodb.com/stitch/reference/service-webhooks
* Sign up with github or google
* Email verification and change password
  "Welcome to Contentful, confirm your email address and get started!"
  "It’s important to do this now, or we won’t be able to reset your password if you ever forget it."
* Relationships - in contentful you can’t lookup the parent from the child
* Approaches to translations - One space per locale or translated texts within one space. You can combine both.
* Archive - soft delete?
* Should there be one database per space or per account?
* Log response times
* Change naming convention from snake case to camel case?
* Allow human readable space keys?
* OK? Request/Response JSON structure for list/get endpoints - compare contentful
  doc/docs/meta
* Alternative to ajv for schema validation: https://github.com/tdegrunt/jsonschema
* Try using Postgres instead of mongo (on a branch)
  See: https://node-postgres.com/features/types
* Use bcrypt instead of crypto when it works with latest Node?
* Investigate using [Auth0](https://auth0.com/docs/api-auth) for authentication?
* Documentation - Readable/writable fields, type coercion, etc.

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

## API Examples

For Heroku:

```
export BASE_URL=https://versioned2.herokuapp.com/v1
```

Create user:

```
export BASE_URL=http://localhost:3000/v1
echo '{"name": "Admin User", "email": "admin@example.com", "password": "admin"}' | http POST $BASE_URL/users
```

Make super user:

```
mongo versioned2_development
db.users.update({_id: '$USER_ID'}, {$set: {superUser: true}})
```

Create a bunch of users:

```
export BASE_URL=http://localhost:3000/v1
while [ 1 ]; do echo "{\"name\": \"Admin User\", \"email\": \"$(uuid)@example.com\", \"password\": \"admin\"}" | http POST $BASE_URL/users; done
```

Login:

```bash
export BASE_URL=http://localhost:3000/v1
echo '{"email": "admin@example.com", "password": "admin"}' | http POST $BASE_URL/login
```

Get routes:

```
http $BASE_URL/sys/routes Authorization:"Bearer $TOKEN"
```

Create account:

```
echo '{"name": "My CMS"}' | http POST $BASE_URL/accounts Authorization:"Bearer $TOKEN"
export ACCOUNT_ID=...
```

Create Space:

```
http POST $BASE_URL/$ACCOUNT_ID/spaces Authorization:"Bearer $TOKEN" name="My Content"
export SPACE_ID=...
```

Create Published Model in Space:

```
export SPACE_ID=...
export ACCOUNT_ID=...
echo "{\"name\": \"Published Items\", \"spaceId\": \"${SPACE_ID}\", \"coll\": \"items\", \"features\": [\"published\"], \"model\": {\"schema\": {\"type\": \"object\", \"properties\": {\"title\": {\"type\": \"string\"}, \"key\": {\"type\": \"string\", \"x-meta\": {\"update\": false}}}}}}" | http POST $BASE_URL/$ACCOUNT_ID/models Authorization:"Bearer $TOKEN"
```

Create some content for that model:

```
http POST $BASE_URL/data/5ad73afec6d5f37d3d593ac1/items Authorization:"Bearer $TOKEN" title="My first item"
```

List content:

```
http $BASE_URL/data/5ad73afec6d5f37d3d593ac1/items Authorization:"Bearer $TOKEN"
http "$BASE_URL/data/5ad73afec6d5f37d3d593ac1/items?published=1" Authorization:"Bearer $TOKEN"
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
