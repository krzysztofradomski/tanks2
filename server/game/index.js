class Game {
  constructor (io, roomId) {
    this.io = io
    this.id = roomId
    this.time = 0
    this.running = false
    this.interval = null
    this.framerate = 1000 / 30
  }

  start () {
    if (this.running === false) {
      this.running = true
      this.interval = setInterval(() => {
        this.gameLoop()
        const gameData = this.time
        this.io.to(this.id).emit('gametime', gameData)
      }, this.framerate)
    }
  }

  gameLoop () {
    this.time++
  }

  stop () {
    if (this.running === true) {
      this.running = false
      clearInterval(this.interval)
    }
  }
}

module.exports = Game
