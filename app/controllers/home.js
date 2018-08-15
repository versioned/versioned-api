const {redirect} = require('app/config').modules.response

async function index (req, res) {
  redirect(res, '/swagger-ui/index.html?url=/v1/swagger.json')
}

module.exports = {
  index
}
