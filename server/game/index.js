// class Game {
//   constructor (io, roomId) {
//     this.io = io
//     this.id = roomId
//     this.time = 0
//     this.running = false
//     this.interval = null
//     this.framerate = 1000 / 30
//   }

//   start () {
//     if (this.running === false) {
//       this.running = true
//       this.interval = setInterval(() => {
//         this.gameLoop()
//         const gameData = this.time
//         this.io.to(this.id).emit('gametime', gameData)
//       }, this.framerate)
//     }
//   }

//   gameLoop () {
//     this.time++
//   }

//   stop () {
//     if (this.running === true) {
//       this.running = false
//       clearInterval(this.interval)
//     }
//   }
// }

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

const startGame = state => ({
  start () {
    if (state.running === false) {
      state.running = true
      state.interval = setInterval(() => {
        loopGame(state).gameLoop()
        const gameData = state.time
        state.io.to(state.id).emit('gametime', gameData)
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

module.exports = Game
