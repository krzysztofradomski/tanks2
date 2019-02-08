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

  // IO begins.
  io.on('connection', function(socket) {
    // House keeping
    console.log('Connected socket ', socket.id)
    // Keep track of all clients, for future use now.
    allClients.push(socket)

    // Declare function  to clear out empty rooms.
    function clearEmptyRooms() {
      roomsById = roomsById.filter(room => {
        if (io.nsps['/'].adapter.rooms[room]) {
          return room
        }
      })
    }

    // Declare function to broadcast room stats to everyone connected.
    function broadcastRoomsData() {
      clearEmptyRooms();
      var roomsData = {
        amount: roomsById.length,
        roomsById: roomsById,
        rooms: roomsById.map(room => ({
          id: room,
          nr: Number(room[room.length -1]),
          data: io.nsps['/'].adapter.rooms[room]
        }))
      }
      io.emit('roomsData', roomsData)
    }

    function joinRoomNumber(nr, auto) {
      var room = 'room-' + nr
      if (
        auto ||
        (io.nsps['/'].adapter.rooms[room] &&
          io.nsps['/'].adapter.rooms[room].length < config.MAX_ROOM_SIZE &&
          io.nsps['/'].adapter.rooms[room].sockets[socket.id] === undefined)
      ) {
        socket.join(room)
        socket.emit('connectToRoom', nr)
        // Update roomsById with current room id.
        if (roomsById.indexOf(room) < 0) {
          roomsById.push(room)
        }
        broadcastRoomsData()
      } else {
        var message = 'Failed to connect to room nr.: ' + nr + '.'
        socket.emit('nonBreakingError', message)
      }
    }

    // Setup a room.
    var currentRoom = 'room-' + roomNumber
    // Increase roomNumber if MAX_ROOM_SIZE clients are present in a room.
    if (
      io.nsps['/'].adapter.rooms[currentRoom] &&
      io.nsps['/'].adapter.rooms[currentRoom].length > config.MAX_ROOM_SIZE - 1
    ) {
      roomNumber++
      currentRoom = 'room-' + roomNumber
    }

    // Auto join newly created room.
    socket.on('autoJoin', function() {
      var room = 'room-' + roomsById.length
      var firstfree = roomsById.length
      if (io.nsps['/'].adapter.rooms[room] === undefined) {
        firstfree = roomsById.length + 1
      }
      if (
        io.nsps['/'].adapter.rooms[room] &&
        io.nsps['/'].adapter.rooms[room].length === config.MAX_ROOM_SIZE
      ) {
        firstfree = roomsById.length + 1
      }
      var some = roomsById
        .map(room => ({
          id: room,
          nr: Number(room[room.length -1]),
          data: io.nsps['/'].adapter.rooms[room]
        }))

      console.log('some', some)
      some = some.filter(entry => entry.data && entry.data.length === 1)[0]
      console.log('some', some)
      firstfree = some ? some.nr : roomsById.length + 1
      console.log('firstfree', firstfree)
      joinRoomNumber(firstfree, true)
    })

    // Handle client disconnect.
    socket.on('disconnect', function() {
      // console.log('A client disconnected.')
      if (!io.nsps['/'].adapter.rooms[currentRoom]) {
        roomsById.filter(room => room !== currentRoom)
      }
      var i = allClients.indexOf(socket)
      allClients.splice(i, 1)
      socket.leave(currentRoom)
      broadcastRoomsData()
    })

    // Handle client join room event, if criteria met.
    socket.on('joinRoomByNumber', function(roomNumber) {
      joinRoomNumber(roomNumber)
    })

    // Handle client leave room by id event.
    socket.on('leaveRoomByNumber', function(roomNumber) {
      var room = 'room-' + roomNumber
      if (!io.nsps['/'].adapter.rooms[room]) {
        roomsById.filter(room => room !== room)
      }
      if (
        io.nsps['/'].adapter.rooms[room] &&
        io.nsps['/'].adapter.rooms[room].sockets[socket.id] !== undefined
      ) {
        var i = allClients.indexOf(socket)
        allClients.splice(i, 1)
        socket.leave(room)
        socket.emit('leftRoom', roomNumber)
        broadcastRoomsData()
      } else {
        var message = 'Failed to leave room nr.: ' + roomNumber + '.'
        socket.emit('nonBreakingError', message)
      }
    })

    // broadcastRoomsData stats to everyone connected.
    broadcastRoomsData()
  })
  // IO ends.

  // Spin up the server.
  http.listen(3000, function() {
    console.log('Listening on localhost:3000')
  })
}

module.exports = startServer
