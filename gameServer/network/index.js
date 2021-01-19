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
 * This class sets up the Socket.io communication and shared namespace.
 * It's a singleton!
 * It requires an Socket.io instance based on the Express server.
 * Variable roomNumber is the initial room index.
 * Variables shared by connections are either computed (managed by event handlers),
 * or native (extracted from Socket.io).
 *
 * @param {object} io
 */
class IOServer {
  constructor(io) {
    this.io = io
    this.roomNumber = 1
    this.computedRoomsById = []
    this.nativeAllConnectedClients = []
    this.nativeAllActiveRooms = this.io.nsps['/'].adapter.rooms
    this.computedActiveGamesMap = {}
    this.handleConnection = this.handleConnection.bind(this)
  }

  /**
   * This function is the basic connection event handler and unique connection namespace.
   * It requires a connection instance obtained from the connection event.
   *
   * @param {object} socket
   */
  handleConnection(socket) {
    console.log('Connected socket: ', socket.id)
    // Keep track of all clients, for future use now.
    this.nativeAllConnectedClients.push(socket)

    // Setup a room.
    let currentRoom = `room-${this.roomNumber}`
    // Increase roomNumber if MAX_ROOM_SIZE clients are present in a room.
    if (
      this.nativeAllActiveRooms[currentRoom] &&
      this.nativeAllActiveRooms[currentRoom].length === config.MAX_ROOM_SIZE
    ) {
      this.roomNumber++
      currentRoom = `room-${this.roomNumber}`
    }

    /**
     *  Deletes empty rooms.
     */
    const clearEmptyRooms = () => {
      this.computedRoomsById = this.computedRoomsById.filter(room => {
        if (this.nativeAllActiveRooms[room]) {
          return room
        }
      })
      if (
        !this.nativeAllActiveRooms[currentRoom] &&
        this.computedActiveGamesMap[currentRoom]
      ) {
        this.computedActiveGamesMap[currentRoom].stop()
        this.computedActiveGamesMap[currentRoom] = null
      }
    }

    /**
     * Returns the id of first room with an empty slot.
     * If there is no such room, it will calculate lowest available index
     * and generate room id.
     *
     * @returns string
     */
    const getFirstFreeRoomId = () => {
      const firstRoomWithEmptySlot = this.computedRoomsById
        .map(room => ({
          id: room,
          data: this.nativeAllActiveRooms[room]
        }))
        .filter(room => getRoomType(room.id) === 'public')
        .filter(
          entry => entry.data && entry.data.length === config.MAX_ROOM_SIZE - 1
        )[0]
      const firstRoomWithEmptySlotId = firstRoomWithEmptySlot
        ? firstRoomWithEmptySlot.id
        : null
      const message = firstRoomWithEmptySlotId
        ? `Room ${firstRoomWithEmptySlotId} has spot, connecting.`
        : `No room with empty spot, creating new one.`
      console.log(message)
      const firstfreeIndex = firstRoomWithEmptySlotId
        ? getNumberFromRoomId(firstRoomWithEmptySlotId)
        : findLowestNumberNotInArray(
          this.computedRoomsById.map(getNumberFromRoomId).sort(sortAscending)
        )
      const firstFreeRoomId = 'room-' + firstfreeIndex
      return firstFreeRoomId
    }

    /**
     * Broadcasts room stats to every connected socket.
     * Emits object.
     *
     */
    const broadcastRoomsData = () => {
      clearEmptyRooms()
      const roomsData = {
        amount: this.computedRoomsById.length,
        computedRoomsById: this.computedRoomsById,
        rooms: this.computedRoomsById.map(room => ({
          id: room,
          type: getRoomType(room),
          data: this.nativeAllActiveRooms[room]
        }))
      }
      this.io.emit('roomsData', roomsData)
    }

    /**
     * Creates and starts a game instance for the respective room, if none exists.
     *
     * @param {string} roomId
     */
    const manageGameInstance = roomId => {
      if (!this.computedActiveGamesMap[roomId]) {
        // console.log('new game', roomId)
        this.computedActiveGamesMap[roomId] = new Game(this.io, roomId)
        this.computedActiveGamesMap[roomId].start()
      }
      this.computedActiveGamesMap[roomId].joinPlayer(socket.id)
    }

    /**
     * Joins given room by room id. Accepts a second optional parameter: mode.
     *
     * @param {string} roomId
     * @param {string} mode
     */
    const joinRoomById = (roomId, mode) => {
      console.log(`Socket ${socket.id} is joining game: ${roomId}.`)
      if (
        mode === 'auto' ||
        (mode === 'private' && !this.nativeAllActiveRooms[roomId]) ||
        (mode === 'private' &&
          this.nativeAllActiveRooms[roomId].length < config.MAX_ROOM_SIZE &&
          this.nativeAllActiveRooms[roomId].sockets[socket.id] === undefined) ||
        (this.nativeAllActiveRooms[roomId] &&
          this.nativeAllActiveRooms[roomId].length < config.MAX_ROOM_SIZE &&
          this.nativeAllActiveRooms[roomId].sockets[socket.id] === undefined)
      ) {
        socket.join(roomId)
        socket.emit('connectedToRoom', roomId)
        currentRoom = roomId
        // Update computedRoomsById with current room id.
        if (this.computedRoomsById.indexOf(roomId) < 0) {
          this.computedRoomsById.push(roomId)
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
    const autoJoin = () => {
      const firstFreeRoomId = getFirstFreeRoomId()
      joinRoomById(firstFreeRoomId, 'auto')
    }

    /**
     * Makes socket join custom name - private - room.
     *
     */
    const joinPrivate = roomId => {
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
    const disconnect = () => {
      console.log('Disconnected socket: ', socket.id)
      socket.leave(currentRoom)
      const i = this.nativeAllConnectedClients.indexOf(socket)
      this.nativeAllConnectedClients.splice(i, 1)
      if (!this.nativeAllActiveRooms[currentRoom]) {
        this.computedRoomsById = this.computedRoomsById.filter(
          room => room !== currentRoom
        )
        this.computedActiveGamesMap[currentRoom] = null
      }
      if (this.computedActiveGamesMap[currentRoom]) {
        this.computedActiveGamesMap[currentRoom].leavePlayer(socket.id)
      }
      broadcastRoomsData()
    }

    /**
     * Makes socket leave its room.
     * Requires room index.
     *
     * @param {number} roomNumber
     */
    const leaveRoomById = roomId => {
      console.log(`Socket ${socket.id} is leaving game: ${roomId}.`)
      if (!this.nativeAllActiveRooms[roomId]) {
        console.log('empty room')
        this.computedRoomsById = this.computedRoomsById.filter(
          r => r !== roomId
        )
        this.computedActiveGamesMap[currentRoom] = null
      }
      if (
        this.nativeAllActiveRooms[roomId] &&
        this.nativeAllActiveRooms[roomId].sockets[socket.id] !== undefined
      ) {
        const i = this.nativeAllConnectedClients.indexOf(socket)
        this.nativeAllConnectedClients.splice(i, 1)
        socket.leave(roomId)
        this.computedActiveGamesMap[roomId].leavePlayer(socket.id)
        socket.emit('leftRoom', roomId)
        broadcastRoomsData()
      } else {
        let message = `Failed to leave room: ${roomId}.`
        console.warn(message)
        socket.emit('nonBreakingError', message)
      }
    }

    const playerMove = data => {
      // console.log('data.roomId', data)
      if (this.computedActiveGamesMap[data.roomId]) {
        this.computedActiveGamesMap[data.roomId].movePlayer({
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

  start() {
    this.io.on('connection', this.handleConnection)
  }
}

module.exports = IOServer
