async function index (req, res) {
  res.writeHead(301, {Location: '/swagger-ui/index.html?url=/v1/swagger.json'})
  res.end('')
}

module.exports = {
  index
}
