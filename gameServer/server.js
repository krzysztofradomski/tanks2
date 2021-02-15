const fs = require('fs')
const express = require('express')
const helmet = require('helmet')
const compression = require('compression')
const fb = require('firebase-admin')
const serviceAccount = require('./key.json')
const SocketServer = require('../gameServer/network')

fb.initializeApp({
  credential: fb.credential.cert(serviceAccount),
  databaseURL: 'https://tanks-c0fa6.firebaseio.com'
})

const db = fb.database()
const fbRef = db.ref('/scores-new')

class Server {
  constructor() {
    this.app = express()
    this.http = require('http').Server(this.app)
    this.io = require('socket.io')(this.http)
    this.fb = fbRef
    this.socketServer = new SocketServer(this.io, this.fb)
  }

  initialiseSocketCommunication() {
    this.socketServer.start()
  }

  listen() {
    this.http.listen(process.env.PORT || 3000, () => {
      console.log('Listening on localhost:3000')
    })
  }

  setup() {
    this.app.use(helmet({
      contentSecurityPolicy: false
    }))
    this.app.use(compression())
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
    this.app.use(express.static('gameClient'))
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
