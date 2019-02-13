/* This is just a mockup UI */

// eslint-disable-next-line
let socket = io()

let roomsData = null
let myId = null
let myRoomNumber = null
let myGameData = null

/**
 * Create buttons to auto join and leave rooms.
 *
 */
function createControls () {
  let controls = [
    { label: 'autoJoin', f: autoJoin, disabled: getMyRoomId() !== null },
    { label: 'leaveRoom', f: leaveRoom, disabled: getMyRoomId() === null }
  ]
  let container = document.getElementById('controls')
  container.innerHTML = ''
  for (let i = 0; i < controls.length; i++) {
    let button = document.createElement('button')
    button.setAttribute('class', 'control')
    button.addEventListener('click', function () {
      controls[i].f()
    })
    button.disabled = controls[i].disabled
    button.innerText = controls[i].label
    container.appendChild(button)
  }
}

/**
 * Create basic html structure to display rooms' info.
 *
 * @param {object} data
 */
function createRoomsDataInfoPanel (data) {
  createControls()
  let container = document.getElementById('rooms')
  container.innerHTML = ''
  for (let i = 0; i < data.amount; i++) {
    let div = document.createElement('div')
    div.setAttribute('class', 'tile')
    div.innerText = data.rooms[i].id
    if (data.rooms[i].data.length < 2) {
      let span = document.createElement('span')
      span.innerText = '1 spot empty'
      div.appendChild(span)
    }
    if (data.rooms[i].data.length === 2) {
      let span = document.createElement('span')
      span.innerText = 'Room full'
      div.appendChild(span)
    }
    if (data.rooms[i].id === getMyRoomId()) {
      let span = document.createElement('span')
      span.innerText = 'This is my room'
      div.appendChild(span)
    }
    if (data.rooms[i].data.length < 2 && getMyRoomId() === null) {
      let button = document.createElement('button')
      button.setAttribute('class', 'joinRoom')
      button.addEventListener('click', function () {
        joinRoom(data.rooms[i].id)
      })
      button.innerText = 'Join room ' + data.rooms[i].nr
      div.appendChild(button)
    }
    container.appendChild(div)
  }
  document.getElementById('room').textContent = getMyRoomNumber()
  document.getElementById('gametime').textContent = getMyGameData()
  console.log('getMyRoomId()', getMyRoomId())
}

/**
 * Join room by room index.
 *
 * @param {string} roomId
 */
function joinRoom (roomId) {
  socket.emit('joinRoomById', roomId)
}

/**
 * Leave room by index.
 *
 * @param {string} roomId
 */
function leaveRoom (roomId) {
  let id = roomId || getMyRoomId()
  socket.emit('leaveRoomById', id)
}

/**
 * Returns connection's active room id, if any.
 *
 * @returns string
 */
function getMyRoomId () {
  let match = roomsData.rooms.filter(
    room => room.data && room.data.sockets[myId]
  )
  return match[0] ? match[0].id : null
}

/**
 * Returns connection's active room index, if any.
 *
 * @returns
 */
function getMyRoomNumber () {
  let match = roomsData.rooms.filter(
    room => room.data && room.data.sockets[myId]
  )
  return match[0] ? match[0].nr : null
}

/**
 * Returns connection's room game data.
 *
 * @returns
 */
function getMyGameData () {
  return myGameData
}

// function getMyId () {
//   return myId
// }

/**
 * Join first available room.
 *
 */
function autoJoin () {
  if (getMyRoomId()) {
    console.warn('Denied. You are already in room ', getMyRoomId())
  } else {
    socket.emit('autoJoin')
  }
}

/**
 * Assign local client id and attach network event handlers.
 *
 */
function clientSetup () {
  socket.on('connect', function () {
    console.log('Connected with id ', socket.id)
    myId = socket.id
  })

  socket.on('connectToRoom', function (data) {
    myRoomNumber = data
    document.getElementById('room').textContent = myRoomNumber
    console.log('Successfully connected to room: ', myRoomNumber)
  })

  socket.on('leftRoom', function (data) {
    myGameData = null
    console.log('Successfully left room: ', data)
  })

  socket.on('roomsData', function (data) {
    console.log('roomsData', data)
    roomsData = data
    createRoomsDataInfoPanel(data)
    document.getElementById('room').textContent = getMyRoomNumber()
  })

  socket.on('nonBreakingError', function (data) {
    console.warn(data)
  })

  socket.on('gameLoop', function (data) {
    myGameData = data
    document.getElementById('gametime').textContent = data
  })
}

clientSetup()
