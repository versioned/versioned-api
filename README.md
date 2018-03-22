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
const jwt = require('app/jwt')
const payload = { foo: 'bar' }
// HS256 secrets are typically 128-bit random strings, for example hex-encoded:
const secret = Buffer.from('fe1a1915a379f3be5394b64d14794932', 'hex')
const token = jwt.encode(payload, secret)
const decoded = jwt.decode(token, secret)
console.log(decoded) //=> { foo: 'bar' }
```
