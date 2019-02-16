_This is work in progress and this document is still a draft._

This project is intended as a JavaScript multiplayer game engine, supporting:

- game rooms for a set amount of players
- individual game instance per game room
- turn-based games
- (eventually) realtime games

Run `npm install` and then `npm start`.

NOTE: at this moment, joining a game room means automatically joining the respective game instance.

Implementation details:

This engine is an Express.js app, it runs the game server and serves the game client. Realtime communication is handled by Socket.io and based on the following network events:

**Server emitted events**:

- _connectedToRoom {string}_ - confirms client joining room of given id
- _roomsData {obj}_ - broadcasts updated rooms and connections data (this is the only event sent to all active clients)
- _leftRoom {string}_ - confirms client leaving room of given id
- _nonBreakingError {string}_ - emits soft errors, like failure to join given room
- _gameLoop_ - emits game instance data to the respective game room

**Server handled events**:

- _disconnect_ - handles terminating a connection (native event)
- _connection_ - sets up new incoming connection server-side (native event)
- _autoJoin_ - client requests joining first available room
- _joinRoomById {string}_ - client requests joining room by given id
- _leaveRoomById {string}_ - client requests leaving room by given id
