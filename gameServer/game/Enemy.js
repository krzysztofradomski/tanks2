const recalculatePosition = pos => {
  const shouldChangeDirection = Math.random() > 0.95
  if (shouldChangeDirection) {
    pos.vector = pos.vector === 'x' ? 'y' : 'x'
  }
  const shouldChangeStep = Math.random() > 0.95
  if (shouldChangeStep) {
    pos.step = pos.step === 1 ? -1 : 1
  }
  // const pos.vector = Math.random() > 0.5 ? pos.vector: 'x' : 'y'
  // const pos.step = Math.random() > 0.5 ? 1 : -1
  return {
    ...pos,
    [pos.vector]: pos[pos.vector] + pos.step
  }
}

const moveEnemy = state => ({
  move: () => {
    if (state.alive) {
      state.position = recalculatePosition(state.position)
      // console.log('move pos', state.position)
    }
    return state
  }
})

const Enemy = ({ id, size = 10, stageSize = 480 }) => {
  const state = {
    id,
    size,
    stageSize,
    label: 'basic enemy',
    health: 100,
    alive: true,
    position: {
      vector: 'x',
      step: 1,
      x: Math.random() * stageSize,
      y: Math.random() * stageSize
    }
  }
  return Object.assign(state, moveEnemy(state))
}

module.exports = Enemy
