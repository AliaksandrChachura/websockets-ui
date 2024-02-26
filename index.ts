import { httpServer } from "./src/http_server/index";
import { startWebSocketServer } from './src/webSocket/webSocketServer';

const HTTP_PORT: number = 8181;
const WS_PORT = 3000;

httpServer.listen(HTTP_PORT, () => console.log(`Start static http server on the ${HTTP_PORT} port!`));

startWebSocketServer(WS_PORT);
