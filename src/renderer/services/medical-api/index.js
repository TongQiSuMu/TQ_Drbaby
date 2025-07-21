const express = require('express')
const cors = require('cors')
const routes = require('./routes')

const app = express()
const PORT = 8012

app.use(cors())
app.use(express.json())

app.use('/api', routes)

let server = null

function startServer() {
  if (server) {
    console.log('Medical API server already running')
    return
  }
  
  server = app.listen(PORT, () => {
    console.log(`Medical API server running at http://localhost:${PORT}`)
    console.log(`API documentation available at http://localhost:${PORT}/docs`)
  })
}

function stopServer() {
  if (server) {
    server.close(() => {
      console.log('Medical API server stopped')
    })
    server = null
  }
}

module.exports = {
  startServer,
  stopServer
}