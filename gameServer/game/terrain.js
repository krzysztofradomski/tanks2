function generateObstacles(obstaclesize = 20, stageSize = 480, enemiesLimit = 10) {
  const obstacles = []
  const random = (min, max) => {
    return Math.round((Math.random() * (max - min) + min) / obstaclesize) * obstaclesize
  }
  for (let count = 0; count < enemiesLimit; count++) {
    let x = random(0, stageSize - obstaclesize)
    let y = random(0, 400)
    for (let times = 0; times < 5; times++) {
      x = x + obstaclesize
      obstacles.push({
        size: obstaclesize,
        x: x,
        y: y
      })
    }
    x = random(0, stageSize - obstaclesize)
    for (let times = 0; times < 5; times++) {
      y = y - obstaclesize
      obstacles.push({
        size: obstaclesize,
        x: x,
        y: y
      })
    }
  }
  return [...obstacles, ...bunkerStructure, eagle]
}

const eagle = {
  type: 'eagle',
  size: 25,
  x: 250,
  y: 455,
  color: 'grey'
}

const bunkerStructure = [
  {
    size: 25,
    x: 200,
    y: 475
  },
  {
    size: 25,
    x: 175,
    y: 475
  },
  {
    size: 25,
    x: 300,
    y: 475
  },
  {
    size: 25,
    x: 325,
    y: 475
  },
  {
    size: 25,
    x: 200,
    y: 450
  },
  {
    size: 25,
    x: 175,
    y: 450
  },
  {
    size: 25,
    x: 300,
    y: 450
  },
  {
    size: 25,
    x: 325,
    y: 450
  },
  {
    size: 25,
    x: 200,
    y: 425
  },
  {
    size: 25,
    x: 175,
    y: 425
  },
  {
    size: 25,
    x: 300,
    y: 425
  },
  {
    size: 25,
    x: 325,
    y: 425
  },
  {
    size: 25,
    x: 225,
    y: 425
  },
  {
    size: 25,
    x: 225,
    y: 425
  },
  {
    size: 25,
    x: 275,
    y: 425
  },
  {
    size: 25,
    x: 250,
    y: 425
  },
  {
    size: 25,
    x: 175,
    y: 400
  },
  {
    size: 25,
    x: 200,
    y: 400
  },
  {
    size: 25,
    x: 225,
    y: 400
  },
  {
    size: 25,
    x: 250,
    y: 400
  },
  {
    size: 25,
    x: 275,
    y: 400
  },
  {
    size: 25,
    x: 300,
    y: 400
  },
  {
    size: 25,
    x: 325,
    y: 400
  }
]

module.exports = { generateObstacles }
