# versioned2

This is a CMS REST API on MongoDB/Node.js - similar to Contentful.

## Start Dev Server

```
npm start
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
const payload = { foo: 'bar' }
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
async function crudTestAsync() {
  const db = await mongo.connect(config.MONGODB_URL)
  const users = db.collection('users')
  const admin = {id:1, email: 'admin@example.com', password: 'admin'}
  console.log('insert result', (await users.insert(admin)).result)
  console.log('find results', await users.find({}).toArray())
  console.log('update results', (await users.updateOne({id: 1}, {$set: {password: 'changed'}})).result)
  console.log('find results after update', await users.find({}).toArray())
  console.log('remove results', (await users.remove({id: 1})).result)
  console.log('find results after remove', await users.find({}).toArray())
}
const resultAsync = crudTestAsync()
```

## Resources

* [node-mongodb-native](https://github.com/mongodb/node-mongodb-native)
