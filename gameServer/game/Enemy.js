const recalculatePosition = pos => {
  const direction = Math.random() > 0.5 ? 'x' : 'y'
  const step = Math.random() > 0.5 ? 1 : -1
  return {
    ...pos,
    [direction]: step
  }
}

const moveEnemy = state => ({
  move: () => {
    if (state.alive) {
      state.position = recalculatePosition(state.position)
    }
  }
})

const Enemy = id => {
  const state = {
    id,
    label: 'basic enemy',
    health: 100,
    alive: true,
    size: 10,
    position: {
      x: 0,
      y: 0
    }
  }
  return { ...moveEnemy(state) }
}

module.exports = Enemy
