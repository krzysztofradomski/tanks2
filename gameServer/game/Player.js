const { createMissile, trackMissile } = require('./shooting')

const movePlayer = state => ({
  move: ({ vector, step }) => {
    state.position = {
      ...state.position,
      [vector]: state.position[vector] + step * 2,
      vector: vector,
      step: step
    }
    return state
  },
  shoot: () => {
    if (state.alive) {
      state.missile = createMissile(state)
    }
  },
  trackMissile: () => {
    if (state.missile) {
      state.missile = trackMissile(state)
    }
  }
})

const Player = ({ id, label, lives = 10, size = 20, stageSize = 480 }) => {
  const state = {
    id,
    size,
    stageSize,
    label,
    lives,
    color: label === 'A' ? 'yellow' : 'green',
    type: 'pc',
    health: 10,
    alive: true,
    position: {
      vector: 'y',
      step: -1,
      x: label === 'A' ? 0 : stageSize - size,
      y: stageSize - size
    },
    score: 0,
    missile: null
  }
  return Object.assign(state, movePlayer(state))
}

module.exports = Player
