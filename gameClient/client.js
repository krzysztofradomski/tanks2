/* eslint-disable no-unused-vars */
/* This is just a mockup UI */

const getRoomType = roomId =>
  RegExp('room', 'ig').test(roomId) ? 'public' : 'private'
const isPrivateRoomNameValid = str => getRoomType(str) === 'private'

// eslint-disable-next-line
let socket = io()

const canvas = document.getElementById('c')
const context = canvas.getContext('2d')
window.ctx = context

let round = 1
let roomsData = null
let playersByIds = []
let myId = null
let myRoomNumber = null
let myRoomId = null
let myGameData = null
let myGameDataStream = []
let enemy = null
let enemyContainer = null
let playerA = null
let playerAContainer = null
let playerB = null
let playerBContainer = null
let app = null
let keyInterval = null
let up = null
let down = null
let left = null
let right = null
let sprites = new Image()
sprites.src = 'assets/sprites.png'
const enemyTanksPositions = {
  x: 240,
  '-x': 161,
  y: 208,
  '-y': 130,
  '1': 0,
  '2': 16,
  '3': 32,
  '4': 48,
  '5': 64,
  '6': 80,
  '7': 96,
  '8': 112
}
const playerPositions = {
  x: 95,
  '-x': 50,
  y: 65,
  '-y': 0,
  'A': 0,
  'B': 129
}
const enemyExplosionPosition = {
  x: -50,
  y: -50
}
let gameNumber = null
let scoresData = null

function drawEnemy(enemy, round) {
  let r = enemy.size
  let x = enemy.position.x
  let y = enemy.position.y
  let vector = (enemy.position.step > 0 ? '' : '-') + enemy.position.vector
  let version = round < 9 ? enemyTanksPositions[String(round)] : enemyTanksPositions[String((Math.random(1) * 8).toFixed(0))]
  context.drawImage(sprites, enemyTanksPositions[vector], version, 15, 15, x, y, r, r)
  // context.drawImage(sprites, 271, 127, 17, 17, enemyExplosionPosition.x, enemyExplosionPosition.y, 25, 25)
};
function drawPlayer(player) {
  // let lives = player.lives
  // let score = player.score
  // document.querySelector('stats ' + player + ' .scoreValue').textContent = score
  // document.querySelector('stats ' + player + ' .livesValue').textContent = lives
  let playerSize = player.size
  let x = player.position.x
  let y = player.position.y
  let vector = (player.position.step > 0 ? '' : '-') + player.position.vector
  let label = player.label
  context.drawImage(sprites, playerPositions[vector], playerPositions[label], 15, 15, x, y, playerSize, playerSize)
  // enemyExplosionPosition = {
  //   'x': -50,
  //   'y': -50
  // }
}

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
  document.getElementById('playerLabel').textContent = getMyGamePlayerLabel()
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
  let match = roomsData
    ? roomsData.rooms.filter(room => room.data && room.data.sockets[myId])
    : []
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
  return myGameData ? parseInt(myGameData.time) : 0
}

function getMyGamePlayerLabel() {
  return myGameData
    ? myGameData.players.filter(player => player.id === myId) &&
    myGameData.players.filter(player => player.id === myId)[0] &&
        myGameData.players.filter(player => player.id === myId)[0].label
    : null
}

/**
 * Returns connection's room players.
 *
 * @returns [string] or null
 */
function getMyGamePlayers() {
  return myGameData
    ? playersByIds
      .map(player => (player === myId ? player + ' (you)' : player))
      .join(', ')
    : null
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

/**
 * Join private room.
 *
 */
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
    document.getElementById('playerLabel').textContent = getMyGamePlayerLabel()
    document.getElementById('players').textContent = getMyGamePlayers()
    console.log('getMyRoomId()', getMyRoomId())
    enemy = null
    playerA = null
    playerB = null
    disableKeyboardControls()
  })

  socket.on('connectedToRoom', function (data) {
    myRoomNumber = data
    myRoomId = getMyRoomId()
    document.getElementById('room').textContent = myRoomNumber
    document.getElementById('playerLabel').textContent = getMyGamePlayerLabel()
    console.log('Successfully connected to room number: ', myRoomNumber)
    console.log('Successfully connected to room id: ', myRoomId)
    enableKeyboardControls()
  })

  socket.on('leftRoom', function (data) {
    context.clearRect(0, 0, canvas.width, canvas.height)
    myGameData = null
    console.log('Successfully left room: ', data)
    console.log('myGameDataStream', myGameDataStream)

    enemy = null
    playerA = null
    playerB = null
    disableKeyboardControls()
    myRoomId = getMyRoomId()
  })

  socket.on('roomsData', function (data) {
    myRoomId = getMyRoomId()
    console.log('roomsData', data)
    roomsData = data
    createRoomsDataInfoPanel(data)
    document.getElementById('room').textContent = getMyRoomId()
    const myRoom = data.rooms.filter(room => room.id === getMyRoomId())[0]
    playersByIds = myRoom ? Object.keys(myRoom.data.sockets) : []
    playersByIds.forEach(id => console.log('connected player id', id))
    document.getElementById('playerLabel').textContent = getMyGamePlayerLabel()
    document.getElementById('players').textContent = getMyGamePlayers()
  })

  socket.on('nonBreakingError', function (data) {
    console.warn(data)
  })

  socket.on('gameLoop', function (data) {
    if (!myGameData) {
      myGameData = data
      document.getElementById('playerLabel').textContent = getMyGamePlayerLabel()
      document.getElementById('players').textContent = getMyGamePlayers()
    } else {
      myGameData = data
    }
    context.clearRect(0, 0, canvas.width, canvas.height)

    // console.log('myGameData', myGameData)
    // myGameDataStream.push(data)

    if (document.getElementById('time').textContent !== getMyGameTime()) {
      document.getElementById('time').textContent = getMyGameTime()
    }

    if (data.enemies.length) {
      data.enemies.forEach(enemy => drawEnemy(enemy, round))
      // console.log('enemy draw', data.enemies[0])
      // let round = 1
      // let r = data.enemies[0].drawsize
      // let x = data.enemies[0].position.x
      // let y = data.enemies[0].position.y
      // let pos = (data.enemies[0].moveto.vector > 0 ? '' : '-') + data.enemies[0].moveto.axis
      // let version = round < 9 ? enemyTanksPositions[String(round)] : enemyTanksPositions[String((Math.random(1) * 8).toFixed(0))]
      // context.drawImage(sprites, enemyTanksPositions[pos], version, 15, 15, x, y, r, r)
      // enemyContainer.x = x
      // enemyContainer.y = y
      // enemyContainer.mask
      //   .beginFill(0xffffff)
      //   .drawCircle(sprite.width / 2, sprite.height / 2, Math.min(sprite.width, sprite.height) / 2)
      //   .endFill()
    }

    if (data.players.length) {
      data.players.forEach(player => drawPlayer(player, round))
      console.log('data', data)

      // playerAContainer = new PIXI.Container()
      // playerA = new PIXI.Graphics()
      // playerA.beginFill(0x3500fa, 1)
      // playerA.drawRect(0, 0, 10, 10)
      // playerA.endFill()
      // playerAContainer.addChild(playerA)
      // const tagStyle = new PIXI.TextStyle({
      //   stroke: 0x3500fa,
      //   fill: 0x3500fa
      // })
      // const tag = new PIXI.Text('Player A', tagStyle)
      // tag.position.set(10, -30)
      // playerAContainer.addChild(tag)
      // app.stage.addChild(playerAContainer)
    }
    // if (!data.players.some(player => player.label === 'A')) {
    //   app.stage.removeChild(playerAContainer)
    //   playerA = null
    // }
    if (playerA) {
      drawEnemy(playerA)
    }
    // if (!playerB && data.players.some(player => player.label === 'B')) {
    //   playerBContainer = new PIXI.Container()
    //   playerB = new PIXI.Graphics()
    //   playerB.beginFill(0x35cc5a, 1)
    //   playerB.drawRect(0, 0, 10, 10)
    //   playerB.endFill()
    //   playerBContainer.addChild(playerB)
    //   const tagStyle = new PIXI.TextStyle({
    //     stroke: 0x35cc5a,
    //     fill: 0x35cc5a
    //   })
    //   const tag = new PIXI.Text('Player B', tagStyle)
    //   tag.position.set(10, -30)
    //   playerBContainer.addChild(tag)
    //   app.stage.addChild(playerBContainer)
    // }
    // if (!data.players.some(player => player.label === 'B')) {
    //   app.stage.removeChild(playerBContainer)
    //   playerB = null
    // }
    // if (playerB) {
    //   const x = data.players.filter(player => player.label === 'B')[0].position
    //     .x
    //   // console.log('playerB x', x)
    //   playerBContainer.x = x
    //   const y = data.players.filter(player => player.label === 'B')[0].position
    //     .y
    //   // console.log('playerA B', y)
    //   playerBContainer.y = y
    // }
  })

  document.getElementById('private').addEventListener('submit', joinPrivateGame)
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

function enableKeyboardControls() {
  myRoomId = getMyRoomId()
  left = keyboard('ArrowLeft')

  up = keyboard('ArrowUp')

  right = keyboard('ArrowRight')

  down = keyboard('ArrowDown')

  left.press = () => {
    const data = {
      roomId: getMyRoomId(),
      vector: 'x',
      step: -1
    }
    clearInterval(keyInterval)
    keyInterval = setInterval(() => socket.emit('playerMove', data), 1000 / 30)
  }
  left.release = () => {
    clearInterval(keyInterval)
  }

  right.press = () => {
    const data = {
      roomId: getMyRoomId(),
      vector: 'x',
      step: 1
    }
    clearInterval(keyInterval)
    keyInterval = setInterval(() => socket.emit('playerMove', data), 1000 / 30)
  }
  right.release = () => {
    clearInterval(keyInterval)
  }

  down.press = () => {
    const data = {
      roomId: getMyRoomId(),
      vector: 'y',
      step: 1
    }
    clearInterval(keyInterval)
    keyInterval = setInterval(() => socket.emit('playerMove', data), 1000 / 30)
  }
  down.release = () => {
    clearInterval(keyInterval)
  }

  up.press = () => {
    const data = {
      roomId: getMyRoomId(),
      vector: 'y',
      step: -1
    }
    clearInterval(keyInterval)
    keyInterval = setInterval(() => socket.emit('playerMove', data), 1000 / 30)
  }
  up.release = () => {
    clearInterval(keyInterval)
  }
}

function disableKeyboardControls() {
  clearInterval(keyInterval)
  up.unsubscribe()
  down.unsubscribe()
  left.unsubscribe()
  right.unsubscribe()
}

clientSetup()
