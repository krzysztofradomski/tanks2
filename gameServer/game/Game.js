const Enemy = require('./Enemy')

const Player = require('./Player')
class Game {
  constructor(io, roomId) {
    this.io = io
    this.id = roomId
    this.time = 0
    this.running = false
    this.interval = null
    // game and physics run at 30 fps, just like our japanese masters envisioned
    this.framerate = 1000 / 30
    this.enemySize = 20
    this.stageSize = 480
    this.playersById = []
    this.enemies = []
    this.players = []
  }

  start() {
    if (this.running === false) {
      console.log(`Game '${this.id}' started.`)
      this.addEnemy()
      this.running = true
      this.scheduleNextTick()
    }
  }

  scheduleNextTick() {
    this.interval = setTimeout(() => this.tick(), this.framerate)
  }

  tick() {
    if (!this.playersById.length) {
      this.stop()
    }
    this.gameLoop()
    const gameData = {
      time: this.time,
      enemies: this.enemies,
      players: this.players,
      playersById: this.playersById
    }
    this.io.to(this.id).emit('gameLoop', gameData)
    this.scheduleNextTick()
  }

  gameLoop() {
    this.time = this.time + 1000 / 30 / 1000
    this.enemies.forEach(enemy => {
      enemy.move()
      enemy.trackMissile()
      Math.random() < 0.1 && enemy.shoot()
    })
    this.collisionsCheck()
  }

  stop() {
    console.log(`Game '${this.id}' stoppped.`)
    if (this.running === true) {
      this.running = false
      this.playersById = []
      this.enemies = []
      this.players = []
      clearInterval(this.interval)
    }
  }

  joinPlayer(id) {
    const label = this.players.some(player => player.label === 'A') ? 'B' : 'A'
    if (this.playersById.indexOf(id) < 0) {
      this.playersById.push(id)
      this.players.push(Player({ id, label }))
    }
  }

  leavePlayer(id) {
    this.playersById = this.playersById.filter(playerId => playerId !== id)
    this.players = this.players.filter(player => player.id !== id)
  }

  movePlayer(data) {
    const { id, ...rest } = data
    const player = this.players.filter(player => player.id === id)[0]
    if (player) {
      player.move(rest)
    }
  }

  addEnemy() {
    const e = Enemy({
      id: `enemy-${Date.now()}`,
      size: this.enemySize,
      stageSize: this.stageSize
    })
    this.enemies.push(e)
  }

  collisionsCheck() {
    this.enemies.forEach(enemy => {
      if (enemy.position.x >= this.stageSize - enemy.size) {
        enemy.position.x = this.stageSize - enemy.size
      }
      if (enemy.position.y >= this.stageSize - enemy.size) {
        enemy.position.y = this.stageSize - enemy.size
      }
      if (enemy.position.x <= enemy.size) {
        enemy.position.x = enemy.size
      }
      if (enemy.position.y <= enemy.size) {
        enemy.position.y = enemy.size
      }
    })
  }
}

module.exports = Game
