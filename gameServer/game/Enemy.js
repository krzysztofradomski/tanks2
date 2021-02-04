const { createMissile, trackMissile } = require('./shooting')

const recalculatePosition = pos => {
  const shouldChangeDirection = Math.random() > 0.95
  if (shouldChangeDirection) {
    pos.vector = pos.vector === 'x' ? 'y' : 'x'
  }
  const shouldChangeStep = Math.random() > 0.95
  if (shouldChangeStep) {
    pos.step = pos.step === 1 ? -1 : 1
  }
  return {
    ...pos,
    [pos.vector]: pos[pos.vector] + pos.step
  }
}

const operateEnemy = state => ({
  move: () => {
    if (state.alive) {
      state.position = recalculatePosition(state.position)
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

const Enemy = ({ id, size = 20, stageSize = 480 }) => {
  const state = {
    id,
    size,
    stageSize,
    type: 'npc',
    color: 'silver',
    label: 'basic enemy',
    health: 100,
    alive: true,
    position: {
      vector: 'x',
      step: 1,
      x: Math.round(Math.random() * stageSize),
      y: Math.round(Math.random() * stageSize / 3)
    }
  }
  return Object.assign(state, operateEnemy(state))
}

module.exports = Enemy
