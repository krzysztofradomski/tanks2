var socket = io();

socket.on('connectToRoom',function(data) {
   document.getElementById('room').textContent = data;
});

socket.on('roomsById', function(data){
   console.log('roomsById', data)
})