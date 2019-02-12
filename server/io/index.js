const Game = require('../game')
const config = require('../config')
const helpers = require('../../helpers/index.js')
const {
  sortAscending,
  findLowestNumberNotInArray,
  getNumberFromRoomId
} = helpers

function startIO (io) {
  // Basic setup.
  let roomNumber = 1
  let computedRoomsById = []
  const nativeAllConnectedClients = []
  const nativeAllActiveRooms = io.nsps['/'].adapter.rooms
  const computedActiveGamesMap = {}

  // IO begins.
  io.on('connection', function (socket) {
    // Log new connections
    console.log('Connected socket id: ', socket.id)
    // Keep track of all clients, for future use now.
    nativeAllConnectedClients.push(socket)

    // Setup a room.
    let currentRoom = `room-${roomNumber}`
    // Increase roomNumber if MAX_ROOM_SIZE clients are present in a room.
    if (
      nativeAllActiveRooms[currentRoom] &&
      nativeAllActiveRooms[currentRoom].length === config.MAX_ROOM_SIZE
    ) {
      roomNumber++
      currentRoom = `room-${roomNumber}`
    }

    // Declare function to clear out empty rooms.
    function clearEmptyRooms () {
      computedRoomsById = computedRoomsById.filter(room => {
        if (nativeAllActiveRooms[room]) {
          return room
        }
      })
      if (
        !nativeAllActiveRooms[currentRoom] &&
        computedActiveGamesMap[currentRoom]
      ) {
        computedActiveGamesMap[currentRoom].stop()
        computedActiveGamesMap[currentRoom] = null
      }
    }

    // Declare function to get first room with an empty slot.
    function getFirstFreeRoomNumber () {
      const firstRoomWithEmptySlot = computedRoomsById
        .map(room => ({
          id: room,
          nr: getNumberFromRoomId(room),
          data: nativeAllActiveRooms[room]
        }))
        .filter(
          entry => entry.data && entry.data.length === config.MAX_ROOM_SIZE - 1
        )[0]
      const firstfree = firstRoomWithEmptySlot
        ? firstRoomWithEmptySlot.nr
        : findLowestNumberNotInArray(
          computedRoomsById.map(getNumberFromRoomId).sort(sortAscending)
        )
      return firstfree
    }

    // Declare function to broadcast room stats to everyone connected.
    function broadcastRoomsData () {
      clearEmptyRooms()
      const roomsData = {
        amount: computedRoomsById.length,
        computedRoomsById: computedRoomsById,
        rooms: computedRoomsById.map(room => ({
          id: room,
          nr: getNumberFromRoomId(room),
          data: nativeAllActiveRooms[room]
        }))
      }
      io.emit('roomsData', roomsData)
    }

    // Declare function to create and join game room.
    function joinGame (roomId) {
      if (!computedActiveGamesMap[roomId]) {
        // console.log('new game', roomId)
        computedActiveGamesMap[roomId] = Game(io, roomId)
        computedActiveGamesMap[roomId].start()
      }
    }

    // Declare function to join specific room.
    function joinRoomNumber (nr, mode) {
      const room = 'room-' + nr
      if (
        mode === 'auto' ||
        (nativeAllActiveRooms[room] &&
          nativeAllActiveRooms[room].length < config.MAX_ROOM_SIZE &&
          nativeAllActiveRooms[room].sockets[socket.id] === undefined)
      ) {
        socket.join(room)
        socket.emit('connectToRoom', nr)
        // Update computedRoomsById with current room id.
        if (computedRoomsById.indexOf(room) < 0) {
          computedRoomsById.push(room)
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
    function autoJoin () {
      const firstFreeRoomNumber = getFirstFreeRoomNumber()
      // console.log('firstfree', firstfree)
      joinRoomNumber(firstFreeRoomNumber, 'auto')
    }

    // Declare function to handle any client disconnecting.
    function disconnect () {
      // console.log('A client disconnected.')
      if (!nativeAllActiveRooms[currentRoom]) {
        computedRoomsById = computedRoomsById.filter(
          room => room !== currentRoom
        )
        computedActiveGamesMap[currentRoom] = null
      }
      const i = nativeAllConnectedClients.indexOf(socket)
      nativeAllConnectedClients.splice(i, 1)
      socket.leave(currentRoom)
      broadcastRoomsData()
    }

    // Declare function to handle leaving a specific room.
    function leaveRoomByNumber (roomNumber) {
      let room = `room-${roomNumber}`
      if (!nativeAllActiveRooms[room]) {
        console.log('empty room')
        computedRoomsById = computedRoomsById.filter(r => r !== room)
        computedActiveGamesMap[currentRoom] = null
      }
      if (
        nativeAllActiveRooms[room] &&
        nativeAllActiveRooms[room].sockets[socket.id] !== undefined
      ) {
        const i = nativeAllConnectedClients.indexOf(socket)
        nativeAllConnectedClients.splice(i, 1)
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
}

module.exports = startIO
