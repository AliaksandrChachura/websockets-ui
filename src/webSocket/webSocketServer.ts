
import { Server as WebSocketServer } from 'ws';
import { Player } from '../types/gameTypes';
import { inMemoryDB } from '../models/inMemoryDB';
import { registerPlayer } from '../utils/handleRegistration';

const startWebSocketServer = (port: number) => {
    const wss = new WebSocketServer({ port: port });
    const memoryDB = new inMemoryDB();

    const players: Player[] = [];

    wss.on('connection', (ws) => {
        console.log('A new client connected.');

        ws.on('message', (message) => {
          console.log("Received message:", message.toString());
          const msg = JSON.parse(message.toString());
          if (msg.type === "reg" && msg.id === 0) {
              try {
                console.log("msg:", msg.data);
                  const response = JSON.stringify(memoryDB.registerPlayer(JSON.parse(msg.data)));
                  // console.log(`25 response ${JSON.stringify({ type: "reg", data: response, id: 0 })}`);
                  ws.send(JSON.stringify({ type: "reg", data: response, id: 0 }));
              } catch (error) {
                console.error('Failed to process message', error);
                ws.send(JSON.stringify({ type: "error", data: { error: true, errorText: "Invalid message format" }, id: 0 }));
              }
          } else if (msg.type === "create_room" && msg.id === 0) {
              const user = memoryDB.getAllPlayers();
              try {
                  // const response = JSON.stringify(memoryDB.createRoom(user));
                  console.log(`create_room: ${JSON.stringify(user)}`);
                  ws.send(JSON.stringify({ type: "create_room", data: "", id: 0 }));
              } catch (error) {
                console.error('Failed to process message', error);
              };
          }
        });   
    });

    console.log(`WebSocket server started on port ${port}`);
}

export { startWebSocketServer }
