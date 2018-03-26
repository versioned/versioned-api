module.exports = {
  suites: [
    {
      name: 'auth',
      tests: [
        {
          name: 'login',
          api_calls: [
            {
              request: 'POST /v1/login',
              params: '{{users.admin}}'
            }
          ]
        }
      ]
    }
  ]
}
