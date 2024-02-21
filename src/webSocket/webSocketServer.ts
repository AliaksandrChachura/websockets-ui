
import WebSocket, { Server as WebSocketServer } from 'ws';
import { Player, Room } from '../types/gameTypes';
import { inMemoryDB } from '../models/inMemoryDB';
import { registerPlayer } from '../utils/handleRegistration';

const startWebSocketServer = (port: number) => {
    const wss = new WebSocketServer({ port: port });
    
    const memoryDB = new inMemoryDB();

    const players: Player[] = [];

    wss.on('connection', (ws) => {
        console.log('A new client connected.');
        // const broadcast = (data) => {
        //     wss.clients.forEach((client) => {
        //         console.log(`client: ${client}`);
        //         console.log(`data: ${JSON.stringify(data)}`);
        //         if (client.readyState === ws.OPEN) {
        //             client.send(JSON.stringify(data));
        //         }
        //     });
        // };

        ws.on('message', (message) => {
          const msg = JSON.parse(message.toString());
          const rooms: Room[] = memoryDB.getAllRooms();
          if (msg.type === "reg" && msg.id === 0) {
              try {
                  const response = JSON.stringify(memoryDB.registerPlayer(JSON.parse(msg.data)));

                  ws.send(JSON.stringify({ type: "reg", data: response, id: 0 }));

                  if(!rooms.length){
                    ws.send(JSON.stringify({ type: "update_room", data: "[]", id: 0 }));
                  } else {
                    const roomUsers = [memoryDB.getAllPlayers()[0]];
                    const roomId = rooms.length
                    ? rooms[0].roomId
                    : null;
                    const data = JSON.stringify([{roomId, roomUsers}]);
                    console.log(`data: ${data}`);
                    ws.send(JSON.stringify({ type: "update_room", data, id: 0 }));
                  }

                  ws.send(JSON.stringify({ type: "update_winners", data: "[]", id: 0 }));
              } catch (error) {
                console.error('Failed to process message', error);
                ws.send(JSON.stringify({ type: "error", data: { error: true, errorText: "Invalid message format" }, id: 0 }));
              }
          } else if (msg.type === "create_room" && msg.id === 0) {
              try {
                  const response = JSON.stringify([memoryDB.createRoom()]);
                  ws.send(JSON.stringify({ type: "update_room", data: response, id: 0 }));
              } catch (error) {
                console.error('Failed to process message', error);
              };
          } else if (msg.type === "add_user_to_room" && msg.id === 0) {
            const roomUsers = memoryDB.getAllPlayers();
            const roomId = memoryDB.getAllRooms()[0].roomId;
            const data = JSON.stringify([{roomId, roomUsers}]);
            ws.send(JSON.stringify({ type: "update_room", data: data, id: 0 }));
            console.log(`update_room ${data}`);
            if (roomUsers.length > 1) {
              const idGame = rooms.length
                    ? rooms[0].roomId
                    : null;
              const idPlayer: number = roomUsers[1]?.index;
              console.log(idPlayer);
              
              const data = JSON.stringify([{idGame, idPlayer}]);
              ws.send(JSON.stringify({ type: "create_game", data, id: 0 }));
            }
          //   {
          //     type: "create_game", //send for both players in the room
          //     data:
          //         {
          //             idGame: <number>,  
          //             idPlayer: <number>, \* id for player in the game session, who have sent add_user_to_room request, not enemy *\
          //         },
          //     id: 0,
          // }
          }
        });   
    });

    console.log(`WebSocket server started on port ${port}`);
};

// const findPlayerByWs = (ws, players) => {
//   // Iterate through the players object to find the player by their WebSocket connection
//   for (const name in players) {
//       if (players.hasOwnProperty(name) && players[name].ws === ws) {
//           return players[name]; // Return the player's data if the WebSocket matches
//       }
//   }
//   return null; // Return null if no player is found for the WebSocket connection
// };

export { startWebSocketServer }
