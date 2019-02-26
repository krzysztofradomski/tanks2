const movePlayer = state => ({
  move: ({ vector, step }) => {
    state.position = {
      ...state.position,
      [vector]: state.position[vector] + step,
      vector: vector,
      step: step
    }
    console.log('move pos', state.position)
    return state
  }
})

const Player = ({ id, label, size = 10, stageSize = 480 }) => {
  const state = {
    id,
    size,
    stageSize,
    label,
    health: 100,
    alive: true,
    position: {
      vector: 'x',
      step: 1,
      x: label === 'A' ? 0 : stageSize - size,
      y: label === 'A' ? stageSize - size : 0
    }
  }
  return Object.assign(state, movePlayer(state))
}

module.exports = Player
