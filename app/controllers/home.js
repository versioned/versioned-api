function index(req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'})
  res.end('Welcome to versioned2')
}

module.exports = {
  index
}
