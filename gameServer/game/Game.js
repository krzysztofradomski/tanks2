const Enemy = require('./Enemy')
const Player = require('./Player')
const { generateObstacles } = require('./terrain')
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
    this.enemyLimit = 10
    this.obstacleSize = 20
    this.playersById = []
    this.enemies = []
    this.players = []
  }

  start() {
    if (this.running === false) {
      console.log(`Game '${this.id}' started.`)
      this.getNewObstacles()
      for (let i = 1; i <= 10; i++) {
        setTimeout(() => {
          this.addEnemy(i)
        }, i * 1000)
      }
      this.addEnemy()
      this.running = true
      this.scheduleNextTick()
    }
  }

  scheduleNextTick() {
    // console.log('scheduleNextTick')
    clearTimeout(this.interval)
    this.interval = setTimeout(() => this.tick(), this.framerate)
  }

  tick() {
    // console.log('tick')
    if (!this.playersById.length && this.gameover) {
      this.stop()
      return
    }
    this.gameLoop()
    const gameData = {
      time: this.time,
      enemies: this.enemies,
      players: this.players,
      playersById: this.playersById,
      obstacles: this.obstacles
    }
    this.io.to(this.id).emit('gameLoop', gameData)
    this.scheduleNextTick()
  }

  gameLoop() {
    if (this.running) {
      this.time = this.time + 1000 / 30 / 1000
      this.enemies.forEach(enemy => {
        enemy.move()
        enemy.trackMissile()
        Math.random() < 0.1 && enemy.shoot()
      })
      this.players.forEach(player => {
        player.trackMissile()
      })
      this.collisionsCheck()
    }
  }

  stop() {
    if (this.running) {
      console.log(`Game '${this.id}' stopped.`)
      this.running = false
      this.playersById = []
      this.enemies = []
      this.players = []
      clearTimeout(this.interval)
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
    console.log('leavePlayer')
    this.playersById = this.playersById.filter(playerId => playerId !== id)
    this.players = this.players.filter(player => player.id !== id)
    if (!this.playersById.length && this.running) {
      this.stop()
    }
    // if (this.io.sockets.sockets[id]) {
    //   this.io.sockets.sockets[id].disconnect()
    // }
  }

  killPlayer(id) {
    console.log('killPlayer')
    this.playersById = this.playersById.filter(playerId => playerId !== id)
    this.players = this.players.filter(player => player.id !== id)
    this.io.to(this.id).emit('playerKill', id)
    if (!this.playersById.length) {
      setTimeout(() => {
        this.io.to(this.id).emit('gameover')
        this.gameover = true
      }, 3000)
    }
  }

  movePlayer(data) {
    const { id, ...rest } = data
    const player = this.players.filter(player => player.id === id)[0]
    if (player) {
      player.move(rest)
    }
  }

  shootPlayer({ id }) {
    const player = this.players.filter(player => player.id === id)[0]
    if (player) {
      player.shoot()
    }
  }

  addEnemy(i) {
    const e = Enemy({
      id: i ? `enemy-${i}` : `enemy-${Date.now()}`,
      size: this.enemySize,
      stageSize: this.stageSize
    })
    this.enemies.push(e)
  }

  killEnemy(id) {
    this.enemies = this.enemies.filter(enemy => enemy.id !== id)
  }

  getNewObstacles() {
    this.obstacles = []
    this.obstacles = generateObstacles()
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
      if (enemy.missile && this.players.length) {
        this.players.forEach(player => {
          if (Math.abs(enemy.missile.position.x - player.position.x) < player.size &&
          Math.abs(enemy.missile.position.y - player.position.y) < player.size) {
            this.killPlayer(player.id)
            enemy.missile = null
          }
        })
      }
      if (this.players.length) {
        this.players.forEach(player => {
          if (player.missile && Math.abs(player.missile.position.x - enemy.position.x) < enemy.size &&
          Math.abs(player.missile.position.y - enemy.position.y) < enemy.size) {
            this.killEnemy(enemy.id)
            player.missile = null
          }
        })
      }
      if (enemy.missile && this.obstacles.length) {
        this.obstacles.forEach(obstacle => {
          if (Math.abs(obstacle.x - enemy.position.x) < enemy.size &&
          Math.abs(obstacle.y - enemy.position.y) < enemy.size) {
            enemy.position.step = -enemy.position.step
          }
          if (enemy.missile && Math.abs(enemy.missile.position.x - obstacle.x) < obstacle.size &&
          Math.abs(enemy.missile.position.y - obstacle.y) < obstacle.size) {
            this.obstacles.splice(this.obstacles.indexOf(obstacle), 1)
            enemy.missile = null
          }
        })
      }
    })
  }
}

module.exports = Game
