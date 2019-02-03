var express = require('express')
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var config = require('./config');


function startServer() {

  var roomNumber = 1;
  var roomsById = [];

  app.use(express.static('client'));
  io.on('connection', function(socket) {
    var currentRoomNumber = 'room-' + roomNumber;
    // Increase roomNumber if 2 clients are present in a room.
    if (
      io.nsps['/'].adapter.rooms[currentRoomNumber] &&
      io.nsps['/'].adapter.rooms[currentRoomNumber].length >= config.MAX_ROOM_SIZE
    ) {
      roomNumber++;
    }
    // Update rooms' stats.
    if (roomsById.indexOf(currentRoomNumber) < 0) {
      roomsById.push(currentRoomNumber);
    }

    socket.join(currentRoomNumber);
  
    // Send this event to everyone in the room.
    io.sockets
      .in(currentRoomNumber)
      .emit('connectToRoom', 'You are in room no. ' + roomNumber);

    // Broadcast stats to everyone connected.
    io.emit('roomsById', roomsById);
  });
  
  http.listen(3000, function() {
    console.log('Listening on localhost:3000');
  });

}

module.exports = startServer;

