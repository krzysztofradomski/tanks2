const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)

const config = require('./config')

const getNumberFromRoomId = str => Number(str.match(/\d+/)[0])

const sortAscending = (a, b) => a - b

const findLowestNumberNotInArray = arr => {
  const set = new Set(arr)
  let i = 1
  while (set.has(i)) {
    i++
  }
  return i
}

function startServer() {
  // Basic setup
  let roomNumber = 1
  let roomsById = []
  const allClients = []
  const allRooms = io.nsps['/'].adapter.rooms

  // Start client hosting.
  app.use(express.static('client'))

  // IO begins.
  io.on('connection', function(socket) {
    // House keeping
    console.log('Connected socket ', socket.id)
    // Keep track of all clients, for future use now.
    allClients.push(socket)
    // Setup a room.
    let currentRoom = `room-${roomNumber}`
    // Increase roomNumber if MAX_ROOM_SIZE clients are present in a room.
    if (
      allRooms[currentRoom] &&
      allRooms[currentRoom].length > config.MAX_ROOM_SIZE - 1
    ) {
      roomNumber++
      currentRoom = `room-${roomNumber}`
    }

    // Declare function to clear out empty rooms.
    function clearEmptyRooms() {
      roomsById = roomsById.filter(room => {
        if (allRooms[room]) {
          return room
        }
      })
    }

    // Declare function to get first room with an empty slot.
    function getFirstFreeRoomNumber() {
      const firstRoomWithEmptySlot = roomsById
        .map(room => ({
          id: room,
          nr: getNumberFromRoomId(room),
          data: allRooms[room]
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
          data: allRooms[room]
        }))
      }
      io.emit('roomsData', roomsData)
    }

    // Declare function to join specific room
    function joinRoomNumber(nr, mode) {
      const room = 'room-' + nr
      if (
        mode === 'auto' ||
        (allRooms[room] &&
          allRooms[room].length < config.MAX_ROOM_SIZE &&
          allRooms[room].sockets[socket.id] === undefined)
      ) {
        socket.join(room)
        socket.emit('connectToRoom', nr)
        // Update roomsById with current room id.
        if (roomsById.indexOf(room) < 0) {
          roomsById.push(room)
        }
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
      if (!allRooms[currentRoom]) {
        roomsById = roomsById.filter(room => room !== currentRoom)
      }
      const i = allClients.indexOf(socket)
      allClients.splice(i, 1)
      socket.leave(currentRoom)
      broadcastRoomsData()
    }

    // Declare function to handle leaving a specific room.
    function leaveRoomByNumber(roomNumber) {
      let room = `room-${roomNumber}`
      if (!allRooms[room]) {
        roomsById = roomsById.filter(room => room !== room)
      }
      if (allRooms[room] && allRooms[room].sockets[socket.id] !== undefined) {
        const i = allClients.indexOf(socket)
        allClients.splice(i, 1)
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
