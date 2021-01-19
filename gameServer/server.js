var fs = require('fs')
const IOServer = require('../gameServer/network')
class Server {
  constructor() {
    this.express = require('express')
    this.app = this.express()
    this.helmet = require('helmet')
    this.compression = require('compression')
    this.http = require('http').Server(this.app)
    this.io = require('socket.io')(this.http)
    this.ioServer = new IOServer(this.io)
  }

  initialiseSocketCommunication() {
    this.ioServer.start()
  }

  listen() {
    this.http.listen(process.env.PORT || 3000, () => {
      console.log('Listening on localhost:3000')
    })
  }

  setup() {
    this.app.use(this.helmet({
      contentSecurityPolicy: false
    }))
    this.app.use(this.compression())
  }

  serveStaticFiles() {
    if (process.env.NODE_ENV !== 'development') {
      fs.rename('gameClient/client.js', 'gameClient/client.old.js', err => {
        if (err) console.log('ERROR: ' + err)
      })
      fs.rename('gameClient/client.min.js', 'gameClient/client.js', err => {
        if (err) console.log('ERROR: ' + err)
      })
    }
    this.app.use(this.express.static('gameClient'))
  }

  start() {
    console.log(`Server started in ${process.env.NODE_ENV} mode.`)
    this.setup()
    this.serveStaticFiles()
    this.initialiseSocketCommunication()
    this.listen()
  }
}

module.exports = Server
