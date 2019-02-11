const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)

const Game = require('./game')
const config = require('./config')
const helpers = require('./helpers')
const {
  sortAscending,
  findLowestNumberNotInArray,
  getNumberFromRoomId
} = helpers

function startServer() {
  // Basic setup.
  let roomNumber = 1
  let roomsById = []
  const allConnectedClients = []
  const allActiveRooms = io.nsps['/'].adapter.rooms
  const activeGamesMap = {}

  // Start client hosting.
  app.use(express.static('client'))

  // IO begins.
  io.on('connection', function(socket) {
    // Log new connections
    console.log('Connected socket id: ', socket.id)
    // Keep track of all clients, for future use now.
    allConnectedClients.push(socket)

    // Setup a room.
    let currentRoom = `room-${roomNumber}`
    // Increase roomNumber if MAX_ROOM_SIZE clients are present in a room.
    if (
      allActiveRooms[currentRoom] &&
      allActiveRooms[currentRoom].length === config.MAX_ROOM_SIZE
    ) {
      roomNumber++
      currentRoom = `room-${roomNumber}`
    }

    // Declare function to clear out empty rooms.
    function clearEmptyRooms() {
      roomsById = roomsById.filter(room => {
        if (allActiveRooms[room]) {
          return room
        }
      })
      if (!allActiveRooms[currentRoom] && activeGamesMap[currentRoom]) {
        activeGamesMap[currentRoom].stop()
        activeGamesMap[currentRoom] = null
      }
    }

    // Declare function to get first room with an empty slot.
    function getFirstFreeRoomNumber() {
      const firstRoomWithEmptySlot = roomsById
        .map(room => ({
          id: room,
          nr: getNumberFromRoomId(room),
          data: allActiveRooms[room]
        }))
        .filter(
          entry => entry.data && entry.data.length === config.MAX_ROOM_SIZE - 1
        )[0]
      const firstfree = firstRoomWithEmptySlot
        ? firstRoomWithEmptySlot.nr
        : findLowestNumberNotInArray(
            roomsById.map(getNumberFromRoomId).sort(sortAscending)
          )
      return firstfree
    }

    // Declare function to broadcast room stats to everyone connected.
    function broadcastRoomsData() {
      clearEmptyRooms()
      const roomsData = {
        amount: roomsById.length,
        roomsById: roomsById,
        rooms: roomsById.map(room => ({
          id: room,
          nr: getNumberFromRoomId(room),
          data: allActiveRooms[room]
        }))
      }
      io.emit('roomsData', roomsData)
    }

    // Declare function to create and join game room.
    function joinGame(roomId) {
      if (!activeGamesMap[roomId]) {
        console.log('new game', roomId)
        activeGamesMap[roomId] = new Game(io, roomId)
        activeGamesMap[roomId].start()
      }
    }

    // Declare function to join specific room.
    function joinRoomNumber(nr, mode) {
      const room = 'room-' + nr
      if (
        mode === 'auto' ||
        (allActiveRooms[room] &&
          allActiveRooms[room].length < config.MAX_ROOM_SIZE &&
          allActiveRooms[room].sockets[socket.id] === undefined)
      ) {
        socket.join(room)
        socket.emit('connectToRoom', nr)
        // Update roomsById with current room id.
        if (roomsById.indexOf(room) < 0) {
          roomsById.push(room)
        }
        joinGame(room)
        broadcastRoomsData()
      } else {
        const message = `Failed to connect to room nr.: ${nr}.`
        socket.emit('nonBreakingError', message)
      }
    }

    // Declare function to auto join first room with empty slot,
    // or create and join a new one.
    function autoJoin() {
      const firstFreeRoomNumber = getFirstFreeRoomNumber()
      // console.log('firstfree', firstfree)
      joinRoomNumber(firstFreeRoomNumber, 'auto')
    }

    // Declare function to handle any client disconnecting.
    function disconnect() {
      // console.log('A client disconnected.')
      if (!allActiveRooms[currentRoom]) {
        roomsById = roomsById.filter(room => room !== currentRoom)
        activeGamesMap[currentRoom] = null
      }
      const i = allConnectedClients.indexOf(socket)
      allConnectedClients.splice(i, 1)
      socket.leave(currentRoom)
      broadcastRoomsData()
    }

    // Declare function to handle leaving a specific room.
    function leaveRoomByNumber(roomNumber) {
      let room = `room-${roomNumber}`
      if (!allActiveRooms[room]) {
        console.log('empty room')
        roomsById = roomsById.filter(room => room !== room)
        activeGamesMap[currentRoom] = null
      }
      if (
        allActiveRooms[room] &&
        allActiveRooms[room].sockets[socket.id] !== undefined
      ) {
        const i = allConnectedClients.indexOf(socket)
        allConnectedClients.splice(i, 1)
        socket.leave(room)
        socket.emit('leftRoom', roomNumber)
        broadcastRoomsData()
      } else {
        let message = 'Failed to leave room nr.: ' + roomNumber + '.'
        socket.emit('nonBreakingError', message)
      }
    }

    // Auto join newly created room.
    socket.on('autoJoin', autoJoin)

    // Handle client disconnect.
    socket.on('disconnect', disconnect)

    // Handle client join room event.
    socket.on('joinRoomByNumber', roomNumber => joinRoomNumber(roomNumber))

    // Handle client leave room by id event.
    socket.on('leaveRoomByNumber', leaveRoomByNumber)

    // BroadcastRoomsData stats to everyone connected.
    broadcastRoomsData()
  })
  // IO ends.

  // Spin up the server.
  http.listen(3000, function() {
    console.log('Listening on localhost:3000')
  })
}

module.exports = startServer
