_This is work in progress and this document is still a draft._

This project is intended as a JavaScript multiplayer game engine, featuring:

- game rooms for a set amount of players
- individual game instance per game room
- public and private game rooms
- turn-based games
- realtime games

NOTE: at this moment, joining a game room means automatically joining the respective game instance.
Player is identified by their connection id, and most communication relies on it.

Implementation details:

This engine is an Express.js app, it runs the game server and serves the game client. The visuals are handled by PixiJS engine. Realtime communication is handled by Socket.io library and based on the following network events:

**Server emitted events**:

- _connectedToRoom {string}_ - confirms client joining room of given id
- _roomsData {obj}_ - broadcasts updated rooms and connections data (this is the only event sent to all active clients)
- _leftRoom {string}_ - confirms client leaving room of given id
- _nonBreakingError {string}_ - emits soft errors, like failure to join given room
- _gameLoop_ - emits game instance data to the respective game room

**Server handled events**:

- _connection_ - sets up new incoming connection server-side (native event)
- _autoJoin_ - client requests joining first available public room
- _joinRoomById {string}_ - client requests joining a public room by given id
- _joinPrivate {string}_ - client requests joining a private room by given id
- _leaveRoomById {string}_ - client requests leaving room by given id
- _disconnect_ - handles terminating a connection (native event)
- _playerMove {object}_ - handles player avatar movement control

**Usage**

Development: run `npm install` and then `npm start`.
Build: ...
