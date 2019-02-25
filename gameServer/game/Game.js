const Enemy = require('./Enemy')
class Game {
  constructor(io, roomId) {
    this.io = io
    this.id = roomId
    this.time = 0
    this.running = false
    this.interval = null
    this.framerate = 1000 / 30
    this.stageSize = 480
    this.playersById = []
    this.enemies = []
  }

  start() {
    if (this.running === false) {
      this.running = true
      this.scheduleNextTick()
    }
  }

  scheduleNextTick() {
    this.interval = setTimeout(() => this.tick(), this.framerate)
  }

  tick() {
    this.gameLoop()
    const gameData = {
      time: this.time,
      enemies: this.enemies,
      players: this.playersById
    }
    this.io.to(this.id).emit('gameLoop', gameData)
    this.scheduleNextTick()
  }

  gameLoop() {
    this.time++
    this.enemies.forEach(enemy => enemy.move())
  }

  stop() {
    if (this.running === true) {
      this.running = false
      clearInterval(this.interval)
    }
  }

  joinPlayer(id) {
    this.playersById.push(id)
  }

  leavePlayer(id) {
    this.playersById = this.playersById.filter(player => player !== id)
  }

  addEnemy() {
    this.enemies.push(Enemy(`enemy-${Date.now()}`))
  }

  collisionsCheck() {
    this.enemies.forEach(enemy => {
      if (enemy.position.x >= this.stageSize) {
        enemy.position.x = this.stageSize - this.enemy.size
      }
      if (enemy.position.y >= this.stageSize) {
        enemy.position.y = this.stageSize - this.enemy.size
      }
      if (enemy.position.x <= 0) {
        enemy.position.x = this.enemy.size
      }
      if (enemy.position.y <= 0) {
        enemy.position.y = this.enemy.size
      }
    })
  }
}

module.exports = Game
