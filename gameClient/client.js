(() => {
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
  let topScore = null
  let isNewTopScore = false
  let keyInterval = null
  let up = null
  let down = null
  let left = null
  let right = null
  let spacebar = null
  let sprites = new Image()
  sprites.src = 'assets/sprites.png'
  const enemyTanksPositions = {
    x: 240,
    '-x': 161,
    y: 208,
    '-y': 130,
    1: 0,
    2: 16,
    3: 32,
    4: 48,
    5: 64,
    6: 80,
    7: 96,
    8: 112
  }
  const playerPositions = {
    x: 95,
    '-x': 50,
    y: 65,
    '-y': 0,
    'A': 0,
    'B': 129
  }

  function drawScores(data) {
    console.log('drawScores', data)
    for (let j = 0; j < 3; j++) {
      let suffix = j === 0 ? 'st' : j === 1 ? 'nd' : 'rd'
      let text = typeof data[j] !== 'undefined' ? (j + 1) + suffix + ' place: ' + data[j] + '.' : (j + 1) + suffix + ' place: ' + 'No data available.'
      document.querySelectorAll('.topscores p')[j].textContent = text
    }
    topScore = data.length ? data[0].match(/[0-9]+/g)[0] : 0
  };

  function drawTerrain(obj) {
    let size = obj.size || 20
    let x = obj.x
    let y = obj.y
    if (obj.type === 'eagle') {
      context.drawImage(sprites, 305, 32, 15, 15, x, y, size, size)
    } else {
      context.drawImage(sprites, 256, 0, 15, 15, x, y, size, size)
    }
  };

  function drawMissile(actor) {
    let mr = actor.missile.size
    let mx = actor.missile.position.x
    let my = actor.missile.position.y
    context.beginPath()
    context.fillStyle = actor.color || 'orange'
    context.fillRect(mx, my, mr, mr)
  };

  function drawEnemy(enemy, round) {
    let r = enemy.size
    let x = enemy.position.x
    let y = enemy.position.y
    let vector = (enemy.position.step > 0 ? '' : '-') + enemy.position.vector
    let version = enemy.version
    context.drawImage(sprites, enemyTanksPositions[vector], enemyTanksPositions[version], 15, 15, x, y, r, r)
    if (enemy.missile) {
      drawMissile(enemy)
    }
  };
  function drawPlayer(player) {
    let playerSize = player.size
    let x = player.position.x
    let y = player.position.y
    let vector = (player.position.step > 0 ? '' : '-') + player.position.vector
    let label = player.label
    context.drawImage(sprites, playerPositions[vector], playerPositions[label], 15, 15, x, y, playerSize, playerSize)
    if (player.missile) {
      drawMissile(player)
    }
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
    document.getElementById('playerLabel').textContent = getMyGamePlayerLabel()
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

  function getMyGamePlayerLabel() {
    return myGameData
      ? myGameData.players.filter(player => player.id === myId) &&
    myGameData.players.filter(player => player.id === myId)[0] &&
        myGameData.players.filter(player => player.id === myId)[0].label
      : null
  }
  window.getMyGamePlayerLabel = getMyGamePlayerLabel

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
      document.getElementById('playerLabel').textContent = getMyGamePlayerLabel()
      console.log('getMyRoomId()', getMyRoomId())
      disableKeyboardControls()
    })

    socket.on('connectedToRoom', function (data) {
      myRoomNumber = data
      myRoomId = getMyRoomId()
      document.getElementById('room').textContent = myRoomNumber
      document.getElementById('playerLabel').textContent = getMyGamePlayerLabel()
      console.log('Successfully connected to room number: ', myRoomNumber)
      console.log('Successfully connected to room id: ', myRoomId)
      document.querySelector('.gameover h2').style.top = '-1000px'
      document.querySelector('.pk h2').style.top = '-1000px'
      document.querySelector('.playerA .scoreValue').textContent = ''
      document.querySelector('.playerB .scoreValue').textContent = ''
      enableKeyboardControls()
    })

    socket.on('leftRoom', function (data) {
      context.clearRect(0, 0, canvas.width, canvas.height)
      myGameData = null
      console.log('Successfully left room: ', data)
      console.log('myGameDataStream', myGameDataStream)
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
      socket.emit('requestScores')
    })

    socket.on('publishScores', scores => drawScores(scores))

    socket.on('nonBreakingError', function (data) {
      console.warn(data)
    })

    socket.on('gameLoop', function (data) {
      if (!myGameData) {
        myGameData = data
        document.getElementById('playerLabel').textContent = getMyGamePlayerLabel()
      } else {
        myGameData = data
      }
      context.clearRect(0, 0, canvas.width, canvas.height)

      if (data.enemies.length) {
        data.enemies.forEach(enemy => drawEnemy(enemy, round))
      }

      if (data.players.length) {
        data.players.forEach(player => drawPlayer(player, round))
      }

      if (data.obstacles.length) {
        data.obstacles.forEach(obstacle => drawTerrain(obstacle))
      }

      if (data.explosions.length) {
        data.explosions.forEach(exp => context.drawImage(sprites, 271, 127, 17, 17, exp.x, exp.y, 25, 25))
      }
    })

    socket.on('playerKill', id => {
      // let id = getMyRoomId()
      if (id === myId) {
        document.querySelector('.pk h2').style.top = '10px'
      }

      // socket.emit('leaveRoomById', id)
    })

    socket.on('gameover', () => {
      let id = getMyRoomId()
      document.querySelector('.gameover h2').style.top = '110px'
      socket.emit('leaveRoomById', id)
      if (isNewTopScore) {
        let playerName = prompt('New top score, please enter your name (max 15 characters):', 'Player Unknown')
        if (playerName) {
          playerName = playerName.length > 15 ? playerName.slice(0, 15) + '...' : playerName
        }
        console.log('emit topscore topScore', topScore)
        socket.emit('newTopScore', { playerName, topScore })
      }
    })

    socket.on('round', data => {
      document.querySelector('.nextround h2').style.top = '110px'
      document.querySelector('#round').textContent = data
      document.querySelector('.nextround h2').textContent.replace(/[0-1]/, data)
      setTimeout(() => { document.querySelector('.nextround h2').style.top = '-1000px' }, 2000)
    })

    socket.on('score', data => {
      let scoreA = document.querySelector('.playerA .scoreValue').textContent
      let scoreB = document.querySelector('.playerB .scoreValue').textContent
      if (scoreA != data.A) {
        document.querySelector('.playerA .scoreValue').textContent = data.A
      }
      if (scoreB != data.B) {
        document.querySelector('.playerB .scoreValue').textContent = data.B
      }
      console.log('topScore', topScore)
      console.log('data[getMyGamePlayerLabel()]', data[getMyGamePlayerLabel()])
      if (data[getMyGamePlayerLabel()] > topScore) {
        topScore = data[getMyGamePlayerLabel()]
        isNewTopScore = true
      }
    })

    socket.on('health', data => {
      let healthA = document.querySelector('.playerA .livesValue').textContent
      let healthB = document.querySelector('.playerB .livesValue').textContent
      if (healthA != data.A) {
        document.querySelector('.playerA .livesValue').textContent = data.A
      }
      if (healthB != data.B) {
        document.querySelector('.playerB .livesValue').textContent = data.B
      }
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

    spacebar = keyboard(' ')

    left.press = () => {
      const data = {
        roomId: getMyRoomId(),
        vector: 'x',
        step: -1
      }
      clearInterval(keyInterval)
      keyInterval = setInterval(() => socket.emit('movePlayer', data), 1000 / 30)
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
      keyInterval = setInterval(() => socket.emit('movePlayer', data), 1000 / 30)
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
      keyInterval = setInterval(() => socket.emit('movePlayer', data), 1000 / 30)
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
      keyInterval = setInterval(() => socket.emit('movePlayer', data), 1000 / 30)
    }
    up.release = () => {
      clearInterval(keyInterval)
    }

    spacebar.press = () => socket.emit('shootPlayer', { roomId: getMyRoomId() })
  }

  function disableKeyboardControls() {
    clearInterval(keyInterval)
    up && up.unsubscribe()
    down && down.unsubscribe()
    left && left.unsubscribe()
    right && right.unsubscribe()
    spacebar && spacebar.unsubscribe()
  }

  clientSetup()
})()
