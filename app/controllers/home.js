async function index (req, res) {
  res.writeHead(301, {Location: '/swagger-ui/index.html'})
  res.end('')
}

module.exports = {
  index
}
