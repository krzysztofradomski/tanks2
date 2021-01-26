const createMissile = state => {
  if (!state.missile) {
    const missile = {
      size: 4,
      position: {
        x: Math.round(state.position.x + state.size / 2),
        y: Math.round(state.position.y + state.size / 2),
        vector: state.position.vector,
        step: 5 * state.position.step
      }
    }
    return missile
  } else {
    return state.missile
  }
}
const trackMissile = state => {
  if (state.missile) {
    state.missile.position[state.missile.position.vector] += state.missile.position.step
    if (state.missile.position.x > state.stageSize ||
      state.missile.position.y > state.stageSize ||
      state.missile.position.x < 0 ||
      state.missile.position.y < 0) {
      state.missile = null
    }
    // obstaclesHitDetection();
  }
  return state.missile
}

module.exports = { createMissile, trackMissile }
