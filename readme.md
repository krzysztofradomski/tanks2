_This is work in progress and this document is still a draft._

This project is intended as a JavaScript multiplayer game engine, supporting:

- game rooms for a set amount of players
- individual game instance per game room
- turn-based games
- (eventually) realtime games

Run `npm install` and then `npm start`.

Specs:

This engine is an Express.js app, it runs the game server and serves the game client. Realtime communication is handled by Socket.io and based on the following events:

**Server emitted events**:

- _connectToRoom {integer}_ - confirms socket joining chosen room
- _roomsData {obj}_ - broadcasts updated rooms and connections data (this is the only event sent to all active sockets)
- _leftRoom {integer}_ - confirms socket leaving room of given index
- _nonBreakingError {string}_ - emits soft errors, like failure to join given room
- _gameLoop_ - emits game instance data to the respective game room

**Server handled events**:

- _all client emitted events_
- _disconnect_ - handles terminating a connection (native event)
- _connection_ - sets up new incoming connection server-side (native event)

**Client emitted events**:

- _autoJoin_ - requests joining first available room
- _joinRoomByNumber {integer}_ - requests joining room by room index
- _leaveRoomByNumber {integer}_ - requests leaving room by room index

**Client handled events**:

- _all server emitted events_
- _connect_ - sets up new incoming connection client-side
