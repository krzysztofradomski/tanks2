/* This is just a mockup UI */

const getRoomType = roomId =>
  RegExp('room', 'ig').test(roomId) ? 'public' : 'private'
const isPrivateRoomNameValid = str => getRoomType(str) === 'private'

// eslint-disable-next-line
let socket = io()

let roomsData = null
let myId = null
let myRoomNumber = null
let myGameData = null
let myGameDataStream = []
let enemy = null
let playerA = null
let playerB = null
let app = null

/**
 * Create buttons to auto join and leave rooms.
 *
 */
function createControls() {
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
  document.getElementsByName('joinPrivate')[0].disabled = getMyRoomId() !== null
}

/**
 * Create basic html structure to display rooms' info.
 *
 * @param {object} data
 */
function createRoomsDataInfoPanel(data) {
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
      span.setAttribute('class', 'mine')
      div.appendChild(span)
    }
    if (
      data.rooms[i].type === 'public' &&
      data.rooms[i].data.length < 2 &&
      getMyRoomId() === null
    ) {
      let button = document.createElement('button')
      button.setAttribute('class', 'joinRoom')
      button.addEventListener('click', function () {
        joinRoom(data.rooms[i].id)
      })
      button.innerText = 'Join room ' + data.rooms[i].id
      div.appendChild(button)
    }
    let typeSpan = document.createElement('span')
    typeSpan.innerText = data.rooms[i].type.toUpperCase()
    div.appendChild(typeSpan)

    container.appendChild(div)
  }
  document.getElementById('room').textContent = getMyRoomId()
  document.getElementById('time').textContent = getMyGameTime()
  document.getElementById('players').textContent = getMyGamePlayers()
  console.log('getMyRoomId()', getMyRoomId())
}

/**
 * Join room by room index.
 *
 * @param {string} roomId
 */
function joinRoom(roomId) {
  socket.emit('joinRoomById', roomId)
}

/**
 * Leave room by index.
 *
 * @param {string} roomId
 */
function leaveRoom(roomId) {
  let id = roomId || getMyRoomId()
  socket.emit('leaveRoomById', id)
}

/**
 * Returns connection's active room id, if any.
 *
 * @returns string
 */
function getMyRoomId() {
  let match = roomsData.rooms.filter(
    room => room.data && room.data.sockets[myId]
  )
  return match[0] ? match[0].id : null
}

/**
 * Returns connection's active room index, if any.
 *
 * @returns number or null
 */
// function getMyRoomNumber() {
//   let match = roomsData.rooms.filter(
//     room => room.data && room.data.sockets[myId]
//   )
//   return match[0] ? match[0].nr : null
// }

/**
 * Returns connection's room game time.
 *
 * @returns number or null
 */
function getMyGameTime() {
  return myGameData ? myGameData.time : null
}

/**
 * Returns connection's room players.
 *
 * @returns [string] or null
 */
function getMyGamePlayers() {
  return myGameData ? myGameData.playersById : null
}

/**
 * Join first available room.
 *
 */
function autoJoin() {
  if (getMyRoomId()) {
    console.warn('Denied. You are already in room ', getMyRoomId())
  } else {
    socket.emit('autoJoin')
  }
}

function joinPrivateGame(event) {
  event.preventDefault()
  const customName = document.querySelector('#private input').value
  if (customName.trim() !== '' && isPrivateRoomNameValid(customName)) {
    socket.emit('joinPrivate', customName)
  } else alert('Illegal room name')
  // console.log('customName', customName)
}

/**
 * Assign local client id and attach network event handlers.
 *
 */
function clientSetup() {
  socket.on('connect', function () {
    console.log('Connected with id ', socket.id)
    myId = socket.id
  })

  socket.on('disconnect', function () {
    console.log('Disconnected')
    myGameData = null
    document.getElementById('room').textContent = getMyRoomId()
    document.getElementById('time').textContent = getMyGameTime()
    document.getElementById('players').textContent = getMyGamePlayers()
    console.log('getMyRoomId()', getMyRoomId())
  })

  socket.on('connectedToRoom', function (data) {
    myRoomNumber = data
    document.getElementById('room').textContent = myRoomNumber
    console.log('Successfully connected to room: ', myRoomNumber)
  })

  socket.on('leftRoom', function (data) {
    myGameData = null
    console.log('Successfully left room: ', data)
    console.log('myGameDataStream', myGameDataStream)
    app.stage.removeChild(enemy)
    enemy = null
    app.stage.removeChild(playerA)
    playerA = null
    app.stage.removeChild(playerB)
    playerB = null
  })

  socket.on('roomsData', function (data) {
    console.log('roomsData', data)
    roomsData = data
    createRoomsDataInfoPanel(data)
    document.getElementById('room').textContent = getMyRoomId()
  })

  socket.on('nonBreakingError', function (data) {
    console.warn(data)
  })

  socket.on('gameLoop', function (data) {
    myGameData = data
    myGameDataStream.push(data)
    document.getElementById('time').textContent = getMyGameTime()
    document.getElementById('players').textContent = getMyGamePlayers()
    if (!enemy) {
      enemy = new PIXI.Graphics()
      enemy.beginFill(0xde3249)
      enemy.drawRect(0, 0, 10, 10)
      enemy.endFill()
      app.stage.addChild(enemy)
    }
    if (enemy) {
      enemy.x = data.enemies[0].position.x
      enemy.y = data.enemies[0].position.y
    }

    if (!playerA && data.players.some(player => player.label === 'A')) {
      playerA = new PIXI.Graphics()
      playerA.beginFill(0x3500fa, 1)
      playerA.drawRect(0, 0, 10, 10)
      playerA.endFill()
      app.stage.addChild(playerA)
    }
    if (playerA) {
      const x = data.players.filter(player => player.label === 'A')[0].position
        .x
      console.log('playerA x', x)
      playerA.x = x
      const y = data.players.filter(player => player.label === 'A')[0].position
        .y
      console.log('playerA y', y)
      playerA.y = y
    }
    if (!playerB && data.players.some(player => player.label === 'B')) {
      playerB = new PIXI.Graphics()
      playerB.beginFill(0x35cc5a, 1)
      playerB.drawRect(0, 0, 10, 10)
      playerB.endFill()
      app.stage.addChild(playerB)
    }
    if (playerB) {
      const x = data.players.filter(player => player.label === 'B')[0].position
        .x
      console.log('playerB x', x)
      playerB.x = x
      const y = data.players.filter(player => player.label === 'B')[0].position
        .y
      console.log('playerA B', y)
      playerB.y = y
    }
  })

  document.getElementById('private').addEventListener('submit', joinPrivateGame)
}

function setupPixi() {
  let type = 'WebGL'
  if (!PIXI.utils.isWebGLSupported()) {
    type = 'canvas'
  }

  PIXI.utils.sayHello(type)
  app = new PIXI.Application({ width: 480, height: 480 })
  document.body.appendChild(app.view)
}

function keyboard(value) {
  let key = {}
  key.value = value
  key.isDown = false
  key.isUp = true
  key.press = undefined
  key.release = undefined
  // The `downHandler`
  key.downHandler = event => {
    if (event.key === key.value) {
      if (key.isUp && key.press) key.press()
      key.isDown = true
      key.isUp = false
      event.preventDefault()
    }
  }

  // The `upHandler`
  key.upHandler = event => {
    if (event.key === key.value) {
      if (key.isDown && key.release) key.release()
      key.isDown = false
      key.isUp = true
      event.preventDefault()
    }
  }

  // Attach event listeners
  const downListener = key.downHandler.bind(key)
  const upListener = key.upHandler.bind(key)

  window.addEventListener('keydown', downListener, false)
  window.addEventListener('keyup', upListener, false)

  // Detach event listeners
  key.unsubscribe = () => {
    window.removeEventListener('keydown', downListener)
    window.removeEventListener('keyup', upListener)
  }

  return key
}

clientSetup()
setupPixi()

let left = keyboard('ArrowLeft')

let up = keyboard('ArrowUp')

let right = keyboard('ArrowRight')

let down = keyboard('ArrowDown')

left.press = () => {
  console.log('left')
  const data = {
    vector: 'x',
    step: -1
  }
  socket.emit('playerMove', data)
}

right.press = () => {
  console.log('right')
  const data = {
    vector: 'x',
    step: 1
  }
  socket.emit('playerMove', data)
}

down.press = () => {
  console.log('down')
  const data = {
    vector: 'y',
    step: 1
  }
  socket.emit('playerMove', data)
}

up.press = () => {
  console.log('up')
  const data = {
    vector: 'y',
    step: -1
  }
  socket.emit('playerMove', data)
}
