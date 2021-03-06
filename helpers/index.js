const getNumberFromRoomId = str =>
  str.match(/\d+/) ? Number(str.match(/\d+/)[0]) : null

const sortAscending = (a, b) => a - b

const findLowestNumberNotInArray = arr => {
  const set = new Set(arr)
  let i = 1
  while (set.has(i)) {
    i++
  }
  return i
}

const getRoomType = roomId =>
  RegExp('room', 'ig').test(roomId) ? 'public' : 'private'

module.exports = {
  getNumberFromRoomId,
  sortAscending,
  findLowestNumberNotInArray,
  getRoomType
}
