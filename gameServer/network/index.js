/* TODO: redesign all of this */

const Game = require('../game/Game')
const config = require('../config')
const {
  sortAscending,
  findLowestNumberNotInArray,
  getNumberFromRoomId,
  getRoomType
} = require('../../helpers/index.js')

/**
 * This function sets up the Socket.io communication and main shared namespace.
 * It requires an Socket.io instance based on the Express server.
 * Variable roomNumber is the initial room index.
 * Variables shared by connections are either computed (managed by event handlers),
 * or native (extracted from Socket.io).
 *
 * @param {object} io
 */
function startIO(io) {
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
  function handleConnection(socket) {
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
    function clearEmptyRooms() {
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
     * Returns the id of first room with an empty slot.
     * If there is no such room, it will calculate lowest available index
     * and generate room id.
     *
     * @returns string
     */
    function getFirstFreeRoomId() {
      const firstRoomWithEmptySlot = computedRoomsById
        .map(room => ({
          id: room,
          data: nativeAllActiveRooms[room]
        }))
        .filter(
          entry => entry.data && entry.data.length === config.MAX_ROOM_SIZE - 1
        )[0]
      const firstRoomWithEmptySlotId = firstRoomWithEmptySlot
        ? firstRoomWithEmptySlot.id
        : null
      console.log('firstRoomWithEmptySlotId', firstRoomWithEmptySlotId)
      const firstfreeIndex = firstRoomWithEmptySlotId
        ? getNumberFromRoomId(firstRoomWithEmptySlotId)
        : findLowestNumberNotInArray(
          computedRoomsById.map(getNumberFromRoomId).sort(sortAscending)
        )
      const firstFreeRoomId = 'room-' + firstfreeIndex
      return firstFreeRoomId
    }

    /**
     * Broadcasts room stats to every connected socket.
     * Emits object.
     *
     */
    function broadcastRoomsData() {
      clearEmptyRooms()
      const roomsData = {
        amount: computedRoomsById.length,
        computedRoomsById: computedRoomsById,
        rooms: computedRoomsById.map(room => ({
          id: room,
          type: getRoomType(room),
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
    function manageGameInstance(roomId) {
      if (!computedActiveGamesMap[roomId]) {
        // console.log('new game', roomId)
        computedActiveGamesMap[roomId] = new Game(io, roomId)
        computedActiveGamesMap[roomId].start()
      }
      computedActiveGamesMap[roomId].joinPlayer(socket.id)
    }

    /**
     * Joins given room by room id. Accepts a second optional parameter: mode.
     *
     * @param {string} roomId
     * @param {string} mode
     */
    function joinRoomById(roomId, mode) {
      if (
        mode === 'auto' ||
        (mode === 'private' && !nativeAllActiveRooms[roomId]) ||
        (mode === 'private' &&
          nativeAllActiveRooms[roomId].length < config.MAX_ROOM_SIZE &&
          nativeAllActiveRooms[roomId].sockets[socket.id] === undefined) ||
        (nativeAllActiveRooms[roomId] &&
          nativeAllActiveRooms[roomId].length < config.MAX_ROOM_SIZE &&
          nativeAllActiveRooms[roomId].sockets[socket.id] === undefined)
      ) {
        socket.join(roomId)
        socket.emit('connectedToRoom', roomId)
        // Update computedRoomsById with current room id.
        if (computedRoomsById.indexOf(roomId) < 0) {
          computedRoomsById.push(roomId)
        }
        manageGameInstance(roomId)
        broadcastRoomsData()
      } else {
        const message = `Failed to connect to room ${roomId}.`
        socket.emit('nonBreakingError', message)
      }
    }

    /**
     * Makes socket automatically join first available room.
     *
     */
    function autoJoin() {
      const firstFreeRoomId = getFirstFreeRoomId()
      // console.log('firstfree', firstfree)
      joinRoomById(firstFreeRoomId, 'auto')
    }

    /**
     * Makes socket join custom name - private - room.
     *
     */
    function joinPrivate(roomId) {
      currentRoom = roomId
      if (getRoomType(currentRoom) === 'private') {
        joinRoomById(currentRoom, 'private')
      } else {
        const message = `Illegal room name ${currentRoom}.`
        socket.emit('nonBreakingError', message)
      }
    }

    /**
     * Handles native disconnect event.
     *
     */
    function disconnect() {
      // console.log('A client disconnected.')
      socket.leave(currentRoom)
      const i = nativeAllConnectedClients.indexOf(socket)
      nativeAllConnectedClients.splice(i, 1)
      if (!nativeAllActiveRooms[currentRoom]) {
        computedRoomsById = computedRoomsById.filter(
          room => room !== currentRoom
        )
        computedActiveGamesMap[currentRoom] = null
      }
      if (computedActiveGamesMap[currentRoom]) {
        computedActiveGamesMap[currentRoom].leavePlayer(socket.id)
      }
      broadcastRoomsData()
    }

    /**
     * Makes socket leave its room.
     * Requires room index.
     *
     * @param {number} roomNumber
     */
    function leaveRoomById(roomId) {
      if (!nativeAllActiveRooms[roomId]) {
        console.log('empty room')
        computedRoomsById = computedRoomsById.filter(r => r !== roomId)
        computedActiveGamesMap[currentRoom] = null
      }
      if (
        nativeAllActiveRooms[roomId] &&
        nativeAllActiveRooms[roomId].sockets[socket.id] !== undefined
      ) {
        const i = nativeAllConnectedClients.indexOf(socket)
        nativeAllConnectedClients.splice(i, 1)
        socket.leave(roomId)
        computedActiveGamesMap[roomId].leavePlayer(socket.id)
        socket.emit('leftRoom', roomId)
        broadcastRoomsData()
      } else {
        let message = 'Failed to leave room ' + roomId + '.'
        socket.emit('nonBreakingError', message)
      }
    }

    function playerMove(data) {
      console.log('playerMove')
      if (computedActiveGamesMap[currentRoom]) {
        console.log('playerMove if')
        computedActiveGamesMap[currentRoom].movePlayer({
          id: socket.id,
          ...data
        })
      }
    }

    // Auto join newly created room.
    socket.on('autoJoin', autoJoin)

    // Join a custom named private room.
    socket.on('joinPrivate', roomId => joinPrivate(roomId))

    // Handle client join room by id event.
    socket.on('joinRoomById', roomId => joinRoomById(roomId))

    // Handle client leave room by id event.
    socket.on('leaveRoomById', roomId => leaveRoomById(roomId))

    // Handle client disconnect.
    socket.on('disconnect', disconnect)

    // Handle player move.
    socket.on('playerMove', data => playerMove(data))

    // BroadcastRoomsData stats to everyone connected.
    broadcastRoomsData()
  }

  io.on('connection', handleConnection)
}

module.exports = startIO
