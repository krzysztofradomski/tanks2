var express = require("express")
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);


function startServer() {
  app.use(express.static('client'));
  var roomNumber = 1;
  io.on("connection", function(socket) {
    //Increase roomNumber 2 clients are present in a room.
    if (
      io.nsps["/"].adapter.rooms["room-" + roomNumber] &&
      io.nsps["/"].adapter.rooms["room-" + roomNumber].length > 1
    ) {
      roomNumber++;
    }
     
    socket.join("room-" + roomNumber);
  
    //Send this event to everyone in the room.
    io.sockets
      .in("room-" + roomNumber)
      .emit("connectToRoom", "You are in room no. " + roomNumber);
  });
  
  http.listen(3000, function() {
    console.log("Listening on localhost:3000");
  });
}

module.exports = startServer;

