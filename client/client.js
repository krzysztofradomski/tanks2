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
    { label: 'autoJoin', f: autoJoin, disabled: getMyRoom() !== null },
    { label: 'leaveRoom', f: leaveRoom, disabled: getMyRoom() === null }
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
    if (data.rooms[i].data.length < 2 && getMyRoom() === null) {
      let button = document.createElement('button')
      button.setAttribute('class', 'joinRoom')
      button.addEventListener('click', function () {
        joinRoom(data.rooms[i].nr)
      })
      button.innerText = 'Join room ' + data.rooms[i].nr
      div.appendChild(button)
    }
    container.appendChild(div)
  }
  document.getElementById('room').textContent = getMyRoomNumber()
  document.getElementById('gametime').textContent = getMyGameData()
  console.log('getMyRoom()', getMyRoom())
}

/**
 * Join room by room index.
 *
 * @param {number} roomNumber
 */
function joinRoom (roomNumber) {
  socket.emit('joinRoomByNumber', roomNumber)
}

/**
 * Leave room by index.
 *
 * @param {number} roomNumber
 */
function leaveRoom (roomNumber) {
  let nr = roomNumber || getMyRoomNumber()
  socket.emit('leaveRoomByNumber', nr)
}

/**
 * Returns connection's active room id, if any.
 *
 * @returns string
 */
function getMyRoom () {
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
  if (getMyRoom()) {
    console.warn('Denied. You are already in room ', getMyRoom())
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
    console.log('Successfully connected to room nr.: ', myRoomNumber)
  })

  socket.on('leftRoom', function (data) {
    myGameData = null
    console.log('Successfully left room nr.: ', data)
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
