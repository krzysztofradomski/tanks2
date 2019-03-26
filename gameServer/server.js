const IOServer = require('../gameServer/network')
class Server {
  constructor() {
    this.express = require('express')
    this.app = this.express()
    this.http = require('http').Server(this.app)
    this.io = require('socket.io')(this.http)
    this.ioServer = new IOServer(this.io)
  }

  initialiseSocketCommunication() {
    this.ioServer.start()
  }

  listen() {
    this.http.listen(3000, () => {
      console.log('Listening on localhost:3000')
    })
  }

  serveStaticFiles() {
    this.app.use(this.express.static('gameClient'))
  }

  start() {
    this.serveStaticFiles()
    this.initialiseSocketCommunication()
    this.listen()
  }
}

module.exports = Server
