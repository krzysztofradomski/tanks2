var socket = io()

socket.on('connectToRoom', function(data) {
  document.getElementById('room').textContent = data
})

socket.on('roomsData', function(data) {
  console.log('roomsData', data)
  createStructure(data)
})

function createStructure(data) {
  let container = document.getElementById('rooms')
  container.innerHTML = ''
  container.setAttribute('class', 'container')
  document.body.appendChild(container)
  for (let i = 0; i < data.amount; i++) {
    let div = document.createElement('div')
    div.setAttribute('class', 'tile')
    div.innerText = data.rooms[i].id
    container.appendChild(div)
  }
}
