const Game = require('../game')
const config = require('../config')
const {
  sortAscending,
  findLowestNumberNotInArray,
  getNumberFromRoomId
} = require('../../helpers/index.js')

/**
 * This function sets up the Socket.io communication and shared rooms related namespace.
 * It requires an Socket.io instance based on the Express server.
 * Variable roomNumber is the initial room index.
 * Variables shared by connections are either computed (managed by event handlers),
 * or native (extracted from Socket.io).
 *
 * @param {object} io
 */
function startIO (io) {
  let roomNumber = 1
  let computedRoomsById = []
  const nativeAllConnectedClients = []
  const nativeAllActiveRooms = io.nsps['/'].adapter.rooms
  const computedActiveGamesMap = {}

  /**
   * This function is the basic connection event handler and unique connection namespace.
   * It requires a connection instance obtained from the connection event.
   *
   * @param {object} socket
   */
  function handleConnection (socket) {
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

    /**
     *  Deletes empty rooms.
     */
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

    /**
     * Returns the index of first room with an empty slot.
     * If there is no such room, it will generate lowest available index.
     *
     * @returns number
     */
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

    /**
     * Broadcasts room stats to every connected socket.
     * Emits object.
     *
     */
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

    /**
     * Creates and starts a game instance for the respective room, if none exists.
     *
     * @param {string} roomId
     */
    function createGameInstance (roomId) {
      if (!computedActiveGamesMap[roomId]) {
        // console.log('new game', roomId)
        computedActiveGamesMap[roomId] = Game(io, roomId)
        computedActiveGamesMap[roomId].start()
      }
    }

    /**
     * Joins given room by index. Accepts a second optional parameter: mode.
     *
     * @param {number} nr
     * @param {string} mode
     */
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
        createGameInstance(room)
        broadcastRoomsData()
      } else {
        const message = `Failed to connect to room nr.: ${nr}.`
        socket.emit('nonBreakingError', message)
      }
    }

    /**
     * Makes socket automatically join first available room.
     *
     */
    function autoJoin () {
      const firstFreeRoomNumber = getFirstFreeRoomNumber()
      // console.log('firstfree', firstfree)
      joinRoomNumber(firstFreeRoomNumber, 'auto')
    }

    /**
     * Handles native disconnect event.
     *
     */
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

    /**
     * Makes socket leave its room.
     * Requires room index.
     *
     * @param {number} roomNumber
     */
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
    socket.on('leaveRoomByNumber', roomNumber => leaveRoomByNumber(roomNumber))

    // BroadcastRoomsData stats to everyone connected.
    broadcastRoomsData()
  }

  io.on('connection', handleConnection)
}

module.exports = startIO
