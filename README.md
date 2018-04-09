# versioned2

This is a CMS REST API on MongoDB/Node.js - similar to Contentful.

## TODO

* route conflict /models/1234 and /models/articles?

* models crud API test
* models_validaton API test

* coll update: false

* spaces

* versioning and relationships

* swagger

* Multi tenant: accounts model (users.account_id)
* Multi tenant: spaces model with (account_id, name, key)

## Discussion Points

* OK? Request/Response JSON structure for list/get endpoints - compare contentful
  doc/docs/meta
* Alternative to ajv for schema validation: https://github.com/tdegrunt/jsonschema
* Try using Postgres instead of mongo (on a branch)
  See: https://node-postgres.com/features/types
* Use bcrypt instead of crypto when it works with latest Node?
* Investigate using [Auth0](https://auth0.com/docs/api-auth) for authentication?

## Documentation

* Readable/writable fields
* Type coercion?

## Start Dev Server

```
npm start
```

## Create Admin User

```javascript
async function createAdmin() {
  const mongo = require('lib/mongo')
  const config = require('app/config')
  await mongo.connect(config.MONGODB_URL)

  const users = require('app/models/users')
  const doc = {name: 'Admin User', email: 'admin@example.com', password: 'admin'}
  users.create(doc).then(console.log)
  users.findOne({email: doc.email}).then(console.log)
}
createAdmin()
```

## API: Create User

```
export BASE_URL=http://localhost:3000/v1
echo '{"name": "Admin User", "email": "admin@example.com", "password": "admin"}' | http POST $BASE_URL/users
```

Create a bunch of users:

```
export BASE_URL=http://localhost:3000/v1
while [ 1 ]; do echo "{\"name\": \"Admin User\", \"email\": \"$(uuid)@example.com\", \"password\": \"admin\"}" | http POST $BASE_URL/users; done
```

## API: Login

```bash
export BASE_URL=http://localhost:3000/v1
echo '{"email": "admin@example.com", "password": "admin"}' | http POST $BASE_URL/login
```

## API: List Users

```
export BASE_URL=http://localhost:3000/v1
http GET $BASE_URL/users Authorization:"Bearer $TOKEN"
```

## Routes

```javascript
async function printRoutes() {
  const mongo = require('lib/mongo')
  const config = require('app/config')
  await mongo.connect(config.MONGODB_URL)

  const {getRoutes} = require('app/routes')
  const {prettyJson} = require('lib/util')
  console.log(prettyJson(await getRoutes()))
}
printRoutes()
```

## Integer ID Sequence in MongoDB

```javascript
const mongo = require('lib/mongo')
const config = require('app/config')
mongo.connect(config.MONGODB_URL)

mongo.nextSequence('foobar').then(console.log) // => {value: { _id: 'foobar', seq: 1 }}
mongo.nextSequence('foobar').then(console.log) // => {value: { _id: 'foobar', seq: 2 }}
```

## API Tests

Keep test server running in one terminal with hot reload:

```
npm run api-test-start
```

Run tests in a different terminal:

```
npm run api-test
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
const mongo = require('lib/mongo')
const config = require('app/config')
async function crudTestPromises() {
  const db = await mongo.connect(config.MONGODB_URL)
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
const mongo = require('lib/mongo')
const config = require('app/config')
const {uuid} = require('lib/util')
async function crudTestAsync() {
  const db = await mongo.connect(config.MONGODB_URL)
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
const mongo = require('lib/mongo')
const config = require('app/config')
mongo.connect(config.MONGODB_URL)

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
