const startGame = state => ({
  start () {
    if (state.running === false) {
      state.running = true
      state.interval = setInterval(() => {
        loopGame(state).gameLoop()
        const gameData = state.time
        state.io.to(state.id).emit('gameLoop', gameData)
      }, state.framerate)
    }
  }
})

const loopGame = state => ({
  gameLoop: () => state.time++
})

const stopGame = state => ({
  stop: () => {
    if (state.running === true) {
      state.running = false
      clearInterval(state.interval)
    }
  }
})

const Game = (io, roomId) => {
  const state = {
    io,
    id: roomId,
    time: 0,
    running: false,
    interval: null,
    framerate: 1000 / 30
  }
  return { ...startGame(state), ...loopGame(state), ...stopGame(state) }
}

// eslint-disable-next-line
const gameInstance = Game({}, 'id')
