
import WebSocket, { Server as WebSocketServer } from 'ws';
import { Player, Room } from '../types/gameTypes';
import { inMemoryDB } from '../models/inMemoryDB';
// import { registerPlayer } from '../utils/handleRegistration ';

const startWebSocketServer = (port: number) => {
    const wss = new WebSocketServer({ port });
    
    const memoryDB = new inMemoryDB();

    const wsToPlayerIndex = new Map<WebSocket, string>();

    wss.on('connection', (ws) => {
        ws.on('message', (message) => {
          const msg = JSON.parse(message.toString());
          const rooms: Room[] = memoryDB.getAllRooms();
          
          if (msg.type === "reg" && msg.id === 0) {
              try {
                  const regResponse = memoryDB.registerPlayer(JSON.parse(msg.data));
                  const data = JSON.stringify(regResponse);

                  ws.send(JSON.stringify({ type: "reg", data, id: 0 }));
                  wsToPlayerIndex.set(ws, regResponse.index);

                  if(!rooms.length){
                    ws.send(JSON.stringify({ type: "update_room", data: "[]", id: 0 }));
                  } else {
                    const roomUsers = [memoryDB.getAllPlayers()[0]];
                    const roomId = rooms.length
                    ? rooms[0].roomId
                    : null;
                    const data = JSON.stringify([{roomId, roomUsers}]);
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
            const roomUsers: Player[] = memoryDB.getAllPlayers();
            const roomId: string = memoryDB.getAllRooms()[0].roomId;
            const data = JSON.stringify([{roomId, roomUsers}]);
            if (roomUsers.length === 1) {
              ws.send(JSON.stringify({ type: "update_room", data, id: 0 }));
            } else if (roomUsers.length > 1) {
              const idGame: string = rooms.length
                    ? rooms[0].roomId
                    : null;

              const idPlayer = wsToPlayerIndex.get(ws);
              
              const data = JSON.stringify([{ idGame, idPlayer }]);
              // if (memoryDB.getAllGames.length === 0) {
              //   console.log(memoryDB.getAllGames.length);
                
              //   ws.send(JSON.stringify({ type: "create_game", data, id: 0 }));
              // }
              ws.send(JSON.stringify({ type: "update_room", data: "[]", id: 0 }));
            }
          } else if (msg.type === "add_ships" && msg.id === 0) {
            console.log(`add_ships: ${wsToPlayerIndex.get(ws)}`);
        } 
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close(1000, 'Work completed');
        }
      });   
    });

    console.log(`WebSocket server started on port ${port}`);
};

export { startWebSocketServer }
