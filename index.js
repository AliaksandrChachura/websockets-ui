import { httpServer } from "./src/http_server/index.js";
import { webSocketServer } from "./src/websocket/webSocketServer.js";

const HTTP_PORT = 8181; 
const WEBSOCKET_PORT = 3000;

console.log(`Start static http server on the ${HTTP_PORT} port!`);

httpServer.listen(HTTP_PORT); 
webSocketServer.listen(WEBSOCKET_PORT);