import { httpServer } from "./src/http_server/index";
import { startWebSocketServer } from './src/webSocket/webSocketServer';

const HTTP_PORT: number = 8181;
const WS_PORT = 3000;

console.log(`Start static http server on the ${HTTP_PORT} port!`);
httpServer.listen(HTTP_PORT);

startWebSocketServer(WS_PORT);
