var express = require('express')
var app = express()
var http = require('http').Server(app)
var io = require('socket.io')(http)

var config = require('./config')

function startServer() {
  var roomNumber = 1
  var roomsById = []
  var allClients = []

  app.use(express.static('client'))
  io.on('connection', function(socket) {
    // Keep track of all clients, for future use now.
    allClients.push(socket)
    var currentRoomNumber = 'room-' + roomNumber
    // Increase roomNumber if MAX_ROOM_SIZE clients are present in a room.
    if (
      io.nsps['/'].adapter.rooms[currentRoomNumber] &&
      io.nsps['/'].adapter.rooms[currentRoomNumber].length >
        config.MAX_ROOM_SIZE - 1
    ) {
      roomNumber++
      currentRoomNumber = 'room-' + roomNumber
    }

    // Update roomsById with current room id.
    if (roomsById.indexOf(currentRoomNumber) < 0) {
      roomsById.push(currentRoomNumber)
    }

    // Auto join newly created room.
    socket.join(currentRoomNumber)

    // Handle client disconnect.
    socket.on('disconnect', function() {
      // console.log('A client disconnected.')
      var i = allClients.indexOf(socket)
      allClients.splice(i, 1)
      socket.leave(currentRoomNumber)
      console.log('Disconnected socket ', socket.id)
    })

    // Send this event to everyone in the room.
    io.sockets.in(currentRoomNumber).emit('connectToRoom', roomNumber)

    // Clear out empty rooms.
    roomsById = roomsById.filter(room => {
      if (io.nsps['/'].adapter.rooms[room]) {
        return room
      }
    })

    // Broadcast stats to everyone connected.
    var roomsData = {
      amount: roomsById.length,
      roomsById: roomsById,
      rooms: roomsById.map(room => ({
        id: room,
        data: io.nsps['/'].adapter.rooms[room]
      }))
    }
    io.emit('roomsData', roomsData)

    // Handle client join room by id event.
    socket.on('joinRoom', function(roomNumber) {
      var room = 'room-' + roomNumber
      if (
        io.nsps['/'].adapter.rooms[room] &&
        io.nsps['/'].adapter.rooms[room].length < config.MAX_ROOM_SIZE
      ) {
        socket.join(room)
        socket.emit('connectToRoom', roomNumber)
      } else {
        var message = 'Failed to connect to room nr.: ' + roomNumber + '.'
        socket.emit('nonBreakingError', message)
      }
    })

    // Handle client leave room by id event.
    socket.on('leaveRoom', function(roomNumber) {
      var i = allClients.indexOf(socket)
      allClients.splice(i, 1)
      socket.leave(roomNumber)
    })
    console.log('Connected socket ', socket.id)
  })

  // Spin up the server.
  http.listen(3000, function() {
    console.log('Listening on localhost:3000')
  })
}

module.exports = startServer
