# Versioned REST API

A CMS REST API on MongoDB and Node.js.

## Documentation

Documentation is available at [versioned-doc](https://github.com/versioned/versioned-doc)

## Hosted/Managed Service

A hosted and managed version of this API is available at [versioned.io](http://versioned.io)

## Installation

```
export NODE_PATH=.
npm install
```

## Environment Variables

The api requires the Algolia env variables to be set:

```sh
export ALGOLIASEARCH_API_KEY=...
export ALGOLIASEARCH_API_KEY_SEARCH=...
export ALGOLIASEARCH_APPLICATION_ID=...
```

## Start Dev Server

```
LOG_LEVEL=verbose npm run dev
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

Example of command line data fetching, publishing, and versioning with `curl` and [jq](https://stedolan.github.io/jq/):

```sh
export VERSIONED_EMAIL=peter.marklund@schibsted.com
export VERSIONED_PASSWORD=...
export BASE_URL=http://localhost:3000/v1

# Login
export LOGIN_DATA=$(curl -X POST -H "Content-Type: application/json" -d "{\"email\": \"$VERSIONED_EMAIL\", \"password\": \"$VERSIONED_PASSWORD\"}" $BASE_URL/login?getUser=1)
export AUTH_TOKEN=$(echo $LOGIN_DATA | jq --raw-output .data.token) # token for admin usage
export AUTH="Authorization: Bearer $AUTH_TOKEN"
export ACCOUNT_ID=$(echo $LOGIN_DATA | jq --raw-output .data.user.accounts[0].id)

# List spaces
curl -H "$AUTH" $BASE_URL/$ACCOUNT_ID/spaces

# Get space id by name
export SPACE=$(curl -H "$AUTH" $BASE_URL/$ACCOUNT_ID/spaces?filter.name=Aftonbladet | jq --raw-output .data[0])
export SPACE_ID=$(echo $SPACE | jq --raw-output .id)
export API_KEY=$(echo $SPACE | jq --raw-output .apiKey) # token for clients to fetch published content

# List models in space and output only a few properties
curl -H "$AUTH" "$BASE_URL/$SPACE_ID/models?graph=name,coll,external,features"

# Show data stats for models in space (number of documents per model etc.)
curl -H "$AUTH" "$BASE_URL/$SPACE_ID/dbStats.json"

# List data for a model
curl -H "$AUTH" $BASE_URL/data/$SPACE_ID/sections_metadata

# List data with invalid query param yields error with list of valid params
curl -H "$AUTH" $BASE_URL/data/$SPACE_ID/sections_metadata?foo=bar

# List data with sort (default sort is updatedAt descending)
curl -H "$AUTH" $BASE_URL/data/$SPACE_ID/sections_metadata?sort=title

# List data with filter
curl -H "$AUTH" $BASE_URL/data/$SPACE_ID/sections_metadata?filter.title=Ettan

# List data with text search
curl -H "$AUTH" $BASE_URL/data/$SPACE_ID/sections_metadata?q=Ettan

# List data and fetch relationships
curl -H "$AUTH" $BASE_URL/data/$SPACE_ID/sections_metadata?relationships=section

# List published data using apiKey
curl "$BASE_URL/data/$SPACE_ID/sections_metadata?apiKey=$API_KEY&published=1"

# Publish a document
export ID=$(curl -H "$AUTH" $BASE_URL/data/$SPACE_ID/sections_metadata | jq --raw-output .data[0].id)
curl -X PUT -H "$AUTH" -H "Content-Type: application/json" $BASE_URL/data/$SPACE_ID/sections_metadata/$ID -d '{"publishedVersion": 1}'

# The published document now appears in the listing (i.e. it's visible to clients)
curl "$BASE_URL/data/$SPACE_ID/sections_metadata?apiKey=$API_KEY&published=1"

# Updating a published document creates a draft version
curl -X PUT -H "$AUTH" -H "Content-Type: application/json" $BASE_URL/data/$SPACE_ID/sections_metadata/$ID -d '{"title": "New Title"}'

# View version history of document
curl -H "$AUTH" $BASE_URL/data/$SPACE_ID/sections_metadata/$ID?versions=1

# Publish the draft version
curl -X PUT -H "$AUTH" -H "Content-Type: application/json" $BASE_URL/data/$SPACE_ID/sections_metadata/$ID -d '{"publishedVersion": 2}'

# Unpublish document
curl -X PUT -H "$AUTH" -H "Content-Type: application/json" $BASE_URL/data/$SPACE_ID/sections_metadata/$ID -d '{"publishedVersion": null}'
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
