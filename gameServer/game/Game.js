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
    this.explosions = []
    this.score = {
      'A': 0,
      'B': 0
    }
    this.round = 0
  }

  emitEventAndData(eventName, data) {
    this.io.to(this.id).emit(eventName, data)
  }

  start() {
    if (this.running === false) {
      console.log(`Game '${this.id}' started.`)
      this.generateRoundData()
      this.running = true
      this.scheduleNextTick()
    }
  }

  scheduleNextTick() {
    // console.log('scheduleNextTick')
    clearTimeout(this.interval)
    this.explosions = []
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
      obstacles: this.obstacles,
      explosions: this.explosions
    }
    this.emitEventAndData('gameLoop', gameData)
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
    const a = this.players.find(player => player.label === 'A')
    const b = this.players.find(player => player.label === 'B')
    this.emitEventAndData('health', {
      'A': a ? a.health : '',
      'B': b ? b.health : ''
    })
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
    console.log('killPlayer', id)
    this.playersById = this.playersById.filter(playerId => playerId !== id)
    this.players = this.players.filter(player => player.id !== id)
    this.emitEventAndData('playerKill', id)
    if (!this.playersById.length) {
      setTimeout(() => {
        this.emitEventAndData('gameover')
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

  addEnemy(id, v = 1) {
    const e = Enemy({
      id: id ? `enemy-${id}` : `enemy-${Date.now()}`,
      size: this.enemySize,
      stageSize: this.stageSize,
      version: v
    })
    this.enemies.push(e)
  }

  killEnemy({ id, version }, { label }) {
    this.enemies = this.enemies.filter(enemy => enemy.id !== id)
    this.score[label] = this.score[label] + version
    this.emitEventAndData('score', this.score)
    if (this.enemies.length === 0) {
      this.generateRoundData(this.round + 1)
    }
  }

  getNewObstacles() {
    this.obstacles = []
    this.obstacles = generateObstacles()
  }

  createExplosion(position) {
    this.explosions.push(position)
  }

  generateRoundData(newRound) {
    if (this.round === newRound) return
    this.round++
    this.getNewObstacles()
    this.emitEventAndData('round', this.round)
    for (let i = 1; i <= 10; i++) {
      setTimeout(() => {
        this.addEnemy(i, this.round)
      }, i * 1000)
    }
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
          if (enemy.missile && Math.abs(enemy.missile.position.x - player.position.x) < player.size &&
          Math.abs(enemy.missile.position.y - player.position.y) < player.size) {
            this.createExplosion(player.position)
            player.health--
            this.emitEventAndData('health', { [player.label]: player.health })
            if (player.health <= 0) {
              this.killPlayer(player.id)
            }
            enemy.missile = null
          }
        })
      }
      if (this.players.length) {
        this.players.forEach(player => {
          if (player.missile && Math.abs(player.missile.position.x - enemy.position.x) < enemy.size &&
          Math.abs(player.missile.position.y - enemy.position.y) < enemy.size) {
            this.createExplosion(enemy.position)
            enemy.health--
            if (enemy.health <= 0) {
              this.killEnemy(enemy, player)
            }
            player.missile = null
          }
        })
      }
      if (this.obstacles.length) {
        this.obstacles.forEach(obstacle => {
          if (Math.abs(obstacle.x - enemy.position.x) < enemy.size &&
          Math.abs(obstacle.y - enemy.position.y) < enemy.size) {
            enemy.position.step = -enemy.position.step
          }
          if (enemy.missile && Math.abs(enemy.missile.position.x - obstacle.x) < obstacle.size &&
          Math.abs(enemy.missile.position.y - obstacle.y) < obstacle.size) {
            this.createExplosion(obstacle)
            this.obstacles.splice(this.obstacles.indexOf(obstacle), 1)
            if (obstacle.type === 'eagle') {
              this.emitEventAndData('gameover')
              this.gameover = true
            }
            enemy.missile = null
          }
          if (this.players.length) {
            this.players.forEach(player => {
              if (player.missile && Math.abs(player.missile.position.x - obstacle.x) < obstacle.size &&
              Math.abs(player.missile.position.y - obstacle.y) < obstacle.size) {
                this.createExplosion(obstacle)
                this.obstacles.splice(this.obstacles.indexOf(obstacle), 1)
                if (obstacle.type === 'eagle') {
                  this.emitEventAndData('gameover')
                  this.gameover = true
                }
                player.missile = null
              }
              if (Math.abs(player.position.x - obstacle.x) < obstacle.size &&
              Math.abs(player.position.y - obstacle.y) < obstacle.size) {
                console.log('blocked')
                player.move({ vector: player.position.vector, step: player.position.step * -1 })
              }
            })
          }
        })
      }
    })
  }
}

module.exports = Game
