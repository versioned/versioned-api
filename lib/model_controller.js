const {json} = require('lib/util')

function modelController (modelApi) {
  function create (req, res) {
    const doc = req.params
    modelApi.create(doc).then(doc => {
      res.writeHead(200, {'Content-Type': 'application/json'})
      res.end(json(doc))
    }).catch(error => {
      res.writeHead(422, {'Content-Type': 'application/json'})
      res.end(json(error))
    })
  }

  return {
    create
  }
}

module.exports = modelController
