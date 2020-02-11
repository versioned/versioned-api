#!/usr/bin/env node

const { getConfig } = require('./util')
const createApi = require('./versioned-api-client')

const DEFAULT_CONFIG = {
  BASE_URL: 'http://localhost:3000/v1',
  EMAIL: undefined,
  PASSWORD: undefined,
  SPACE_ID: undefined,
  MODEL: undefined
}

function json (value) {
  return JSON.stringify(value, null, 4)
}

function logResponse (response) {
  console.log(json(response.data))
}

async function main () {
  const config = getConfig(DEFAULT_CONFIG)
  const api = await createApi(config)

  logResponse(await api.dataStats())
  logResponse(await api.modelsList())
}

main()
