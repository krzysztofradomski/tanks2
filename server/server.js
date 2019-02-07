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
    // Update rooms' stats.
    if (roomsById.indexOf(currentRoomNumber) < 0) {
      roomsById.push(currentRoomNumber)
    }

    socket.join(currentRoomNumber)
    socket.on('disconnect', function() {
      console.log('Got disconnect!')
      var i = allClients.indexOf(socket)
      allClients.splice(i, 1)
      socket.leave(currentRoomNumber)
    })

    // Send this event to everyone in the room.
    io.sockets.in(currentRoomNumber).emit('connectToRoom', roomNumber)

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
  })

  http.listen(3000, function() {
    console.log('Listening on localhost:3000')
  })
}

module.exports = startServer
