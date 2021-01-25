const movePlayer = state => ({
  move: ({ vector, step }) => {
    state.position = {
      ...state.position,
      [vector]: state.position[vector] + step,
      vector: vector,
      step: step
    }
    return state
  }
})

const Player = ({ id, label, lives = 5, size = 20, stageSize = 480 }) => {
  const state = {
    id,
    size,
    stageSize,
    label,
    lives,
    health: 100,
    alive: true,
    position: {
      vector: 'y',
      step: -1,
      x: label === 'A' ? 0 : stageSize - size,
      y: stageSize - size
    },
    missile: null
  }
  return Object.assign(state, movePlayer(state))
}

module.exports = Player
