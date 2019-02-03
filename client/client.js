var socket = io();
socket.on('connectToRoom',function(data) {
   document.getElementById('room').textContent = data;
});