import { WebSocketServer } from 'ws';

let wss = null;

// Data structures
const players = new Map(); // Map<ws, {name, password, index}>
const rooms = new Map(); // Map<roomId, {roomId, roomUsers: [{name, index}]}>
const games = new Map(); // Map<gameId, {gameId, players: [{ws, idPlayer, ships, board}], currentPlayerIndex}>
const winners = new Map(); // Map<name, wins>
let nextPlayerIndex = 1;
let nextGamePlayerId = 1; // Separate counter for game session player IDs
let nextRoomId = 1;
let nextGameId = 1;

// Helper functions
function sendMessage(ws, type, data) {
    if (ws && ws.readyState === 1) { // WebSocket.OPEN
        // Always stringify data according to protocol
        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        const message = {
            type,
            data: dataString,
            id: 0
        };
        ws.send(JSON.stringify(message));
    }
}

function broadcastToAll(type, data) {
    wss.clients.forEach((client) => {
        if (client.readyState === 1) {
            sendMessage(client, type, data);
        }
    });
}

function broadcastUpdateRoom() {
    const roomsList = Array.from(rooms.values())
        .filter(room => room.roomUsers.length === 1)
        .map(room => ({
            roomId: room.roomId,
            roomUsers: room.roomUsers
        }));
    
    broadcastToAll('update_room', roomsList);
}

function broadcastUpdateWinners() {
    const winnersList = Array.from(winners.entries())
        .map(([name, wins]) => ({ name, wins }))
        .sort((a, b) => b.wins - a.wins);
    
    broadcastToAll('update_winners', winnersList);
}

function getPlayerByWs(ws) {
    return players.get(ws);
}

function getRoomByPlayer(ws) {
    for (const room of rooms.values()) {
        if (room.roomUsers.some(user => {
            const player = Array.from(players.entries()).find(([pws]) => pws === ws);
            return player && user.index === player[1].index;
        })) {
            return room;
        }
    }
    return null;
}

function getGameByPlayer(ws) {
    for (const game of games.values()) {
        if (game.players.some(p => p.ws === ws)) {
            return game;
        }
    }
    return null;
}

function createBoard() {
    return Array(10).fill(null).map(() => Array(10).fill(null));
}

function isValidShipPosition(ships, board) {
    // Check if all ships are within bounds and don't overlap
    const occupied = new Set();
    
    for (const ship of ships) {
        const { x, y, direction, length } = ship;
        
        // Check bounds
        if (x < 0 || y < 0 || x >= 10 || y >= 10) return false;
        if (direction) { // horizontal
            if (x + length > 10) return false;
        } else { // vertical
            if (y + length > 10) return false;
        }
        
        // Check overlap
        for (let i = 0; i < length; i++) {
            const posX = direction ? x + i : x;
            const posY = direction ? y : y + i;
            const key = `${posX},${posY}`;
            
            if (occupied.has(key)) return false;
            occupied.add(key);
        }
    }
    
    return true;
}

function checkShipKilled(ships, board, x, y) {
    // Find which ship was hit
    for (const ship of ships) {
        const { x: sx, y: sy, direction, length } = ship;
        let isPartOfShip = false;
        
        for (let i = 0; i < length; i++) {
            const posX = direction ? sx + i : sx;
            const posY = direction ? sy : sy + i;
            
            if (posX === x && posY === y) {
                isPartOfShip = true;
                break;
            }
        }
        
        if (isPartOfShip) {
            // Check if all cells of this ship are hit
            let allHit = true;
            for (let i = 0; i < length; i++) {
                const posX = direction ? sx + i : sx;
                const posY = direction ? sy : sy + i;
                
                if (board[posY][posX] !== 'hit') {
                    allHit = false;
                    break;
                }
            }
            
            if (allHit) {
                // Return all cells around the ship (including the ship itself)
                const cells = [];
                for (let i = 0; i < length; i++) {
                    const posX = direction ? sx + i : sx;
                    const posY = direction ? sy : sy + i;
                    
                    // Add ship cell and surrounding cells
                    for (let dx = -1; dx <= 1; dx++) {
                        for (let dy = -1; dy <= 1; dy++) {
                            const nx = posX + dx;
                            const ny = posY + dy;
                            if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10) {
                                cells.push({ x: nx, y: ny });
                            }
                        }
                    }
                }
                return cells;
            }
        }
    }
    
    return null;
}

function checkGameFinished(game, playerIndex) {
    const enemy = game.players.find(p => p.idPlayer !== playerIndex);
    if (!enemy) return false;
    
    // Check if all enemy ships are killed
    let allShipsKilled = true;
    for (const ship of enemy.ships) {
        const { x: sx, y: sy, direction, length } = ship;
        for (let i = 0; i < length; i++) {
            const posX = direction ? sx + i : sx;
            const posY = direction ? sy : sy + i;
            
            if (enemy.board[posY][posX] !== 'hit') {
                allShipsKilled = false;
                break;
            }
        }
        if (!allShipsKilled) break;
    }
    
    return allShipsKilled;
}

// Command handlers
function handleReg(ws, data) {
    try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        const { name, password } = parsedData;
        
        // Check if player already exists
        const existingPlayer = Array.from(players.values()).find(p => p.name === name);
        
        if (existingPlayer && existingPlayer.password !== password) {
            sendMessage(ws, 'reg', {
                name,
                index: 0,
                error: true,
                errorText: 'Invalid password'
            });
            return;
        }
        
        // Create or update player
        const playerIndex = existingPlayer ? existingPlayer.index : nextPlayerIndex++;
        players.set(ws, { name, password, index: playerIndex });
        
        sendMessage(ws, 'reg', {
            name,
            index: playerIndex,
            error: false,
            errorText: ''
        });
        
        broadcastUpdateRoom();
        broadcastUpdateWinners();
    } catch (error) {
        console.error('Error handling reg:', error);
    }
}

function handleCreateRoom(ws) {
    const player = getPlayerByWs(ws);
    if (!player) return;
    
    // Remove player from existing room if any
    const existingRoom = getRoomByPlayer(ws);
    if (existingRoom) {
        existingRoom.roomUsers = existingRoom.roomUsers.filter(
            user => user.index !== player.index
        );
        if (existingRoom.roomUsers.length === 0) {
            rooms.delete(existingRoom.roomId);
        }
    }
    
    // Create new room
    const roomId = nextRoomId++;
    const room = {
        roomId,
        roomUsers: [{ name: player.name, index: player.index }]
    };
    rooms.set(roomId, room);
    
    broadcastUpdateRoom();
}

function handleAddUserToRoom(ws, data) {
    try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        const { indexRoom } = parsedData;
        const player = getPlayerByWs(ws);
        
        if (!player) return;
        
        const room = rooms.get(Number(indexRoom));
        if (!room || room.roomUsers.length !== 1) return;
        
        // Add player to room
        room.roomUsers.push({ name: player.name, index: player.index });
        
        // Remove player from other rooms
        const existingRoom = getRoomByPlayer(ws);
        if (existingRoom && existingRoom.roomId !== room.roomId) {
            existingRoom.roomUsers = existingRoom.roomUsers.filter(
                user => user.index !== player.index
            );
            if (existingRoom.roomUsers.length === 0) {
                rooms.delete(existingRoom.roomId);
            }
        }
        
        // Create game for both players
        const gameId = nextGameId++;
        const player1Ws = Array.from(players.entries()).find(
            ([, p]) => p.index === room.roomUsers[0].index
        )?.[0];
        const player2Ws = Array.from(players.entries()).find(
            ([, p]) => p.index === room.roomUsers[1].index
        )?.[0];
        
        if (!player1Ws || !player2Ws) return;
        
        const idPlayer1 = nextGamePlayerId++;
        const idPlayer2 = nextGamePlayerId++;
        
        const game = {
            gameId,
            players: [
                { ws: player1Ws, idPlayer: idPlayer1, ships: [], board: createBoard() },
                { ws: player2Ws, idPlayer: idPlayer2, ships: [], board: createBoard() }
            ],
            currentPlayerIndex: null,
            shipsReceived: 0
        };
        games.set(gameId, game);
        
        // Remove room from available rooms
        rooms.delete(room.roomId);
        
        // Send create_game to both players
        sendMessage(player1Ws, 'create_game', {
            idGame: gameId,
            idPlayer: idPlayer1
        });
        sendMessage(player2Ws, 'create_game', {
            idGame: gameId,
            idPlayer: idPlayer2
        });
        
        broadcastUpdateRoom();
    } catch (error) {
        console.error('Error handling add_user_to_room:', error);
    }
}

function handleAddShips(ws, data) {
    try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        const { gameId, ships, indexPlayer } = parsedData;
        
        const game = games.get(Number(gameId));
        if (!game) return;
        
        const player = game.players.find(p => p.idPlayer === Number(indexPlayer));
        if (!player || player.ships.length > 0) return;
        
        // Validate ship positions
        if (!isValidShipPosition(ships, player.board)) {
            return; // Invalid ship placement, ignore
        }
        
        player.ships = ships;
        game.shipsReceived++;
        
        // If both players have sent ships, start the game
        if (game.shipsReceived === 2) {
            const currentPlayerIndex = game.players[0].idPlayer;
            game.currentPlayerIndex = currentPlayerIndex;
            
            // Send start_game to both players
            game.players.forEach(p => {
                sendMessage(p.ws, 'start_game', {
                    ships: p.ships,
                    currentPlayerIndex
                });
            });
            
            // Send turn to both players
            game.players.forEach(p => {
                sendMessage(p.ws, 'turn', {
                    currentPlayer: currentPlayerIndex
                });
            });
        }
    } catch (error) {
        console.error('Error handling add_ships:', error);
    }
}

function handleAttack(ws, data) {
    try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        const { gameId, x, y, indexPlayer } = parsedData;
        
        const game = games.get(Number(gameId));
        if (!game) return;
        
        const attacker = game.players.find(p => p.idPlayer === Number(indexPlayer));
        const enemy = game.players.find(p => p.idPlayer !== Number(indexPlayer));
        
        if (!attacker || !enemy) return;
        
        // Check if it's attacker's turn
        if (game.currentPlayerIndex !== attacker.idPlayer) return;
        
        // Check if cell was already attacked
        if (enemy.board[y][x] !== null) return;
        
        // Check if hit
        let hit = false;
        for (const ship of enemy.ships) {
            const { x: sx, y: sy, direction, length } = ship;
            for (let i = 0; i < length; i++) {
                const posX = direction ? sx + i : sx;
                const posY = direction ? sy : sy + i;
                
                if (posX === x && posY === y) {
                    hit = true;
                    enemy.board[y][x] = 'hit';
                    break;
                }
            }
            if (hit) break;
        }
        
        if (!hit) {
            enemy.board[y][x] = 'miss';
        }
        
        // Check if ship was killed
        const killedCells = hit ? checkShipKilled(enemy.ships, enemy.board, x, y) : null;
        
        let status = hit ? 'shot' : 'miss';
        if (killedCells) {
            status = 'killed';
            // Mark all cells around killed ship as miss
            killedCells.forEach(({ x: kx, y: ky }) => {
                if (enemy.board[ky][kx] === null) {
                    enemy.board[ky][kx] = 'miss';
                }
            });
        }
        
        // Send attack result to both players
        const attackData = {
            position: { x, y },
            currentPlayer: attacker.idPlayer,
            status
        };
        
        game.players.forEach(p => {
            sendMessage(p.ws, 'attack', attackData);
        });
        
        // If killed, send additional miss messages for cells around ship
        if (killedCells) {
            killedCells.forEach(({ x: kx, y: ky }) => {
                if (kx !== x || ky !== y) { // Don't send the hit cell again
                    const missData = {
                        position: { x: kx, y: ky },
                        currentPlayer: attacker.idPlayer,
                        status: 'miss'
                    };
                    game.players.forEach(p => {
                        sendMessage(p.ws, 'attack', missData);
                    });
                }
            });
        }
        
        // Check if game is finished
        if (status === 'killed' && checkGameFinished(game, attacker.idPlayer)) {
            // Find winner by matching the game session idPlayer
            const winnerPlayer = game.players.find(p => p.idPlayer === attacker.idPlayer);
            const winnerName = winnerPlayer ? Array.from(players.entries()).find(
                ([pws]) => pws === winnerPlayer.ws
            )?.[1]?.name : null;
            
            if (winnerName) {
                const currentWins = winners.get(winnerName) || 0;
                winners.set(winnerName, currentWins + 1);
            }
            
            game.players.forEach(p => {
                sendMessage(p.ws, 'finish', {
                    winPlayer: attacker.idPlayer
                });
            });
            
            broadcastUpdateWinners();
            games.delete(game.gameId);
            return;
        }
        
        // Change turn if miss
        if (status === 'miss') {
            game.currentPlayerIndex = enemy.idPlayer;
        }
        
        // Send turn to both players
        game.players.forEach(p => {
            sendMessage(p.ws, 'turn', {
                currentPlayer: game.currentPlayerIndex
            });
        });
    } catch (error) {
        console.error('Error handling attack:', error);
    }
}

function handleRandomAttack(ws, data) {
    try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        const { gameId, indexPlayer } = parsedData;
        
        const game = games.get(Number(gameId));
        if (!game) return;
        
        const attacker = game.players.find(p => p.idPlayer === Number(indexPlayer));
        const enemy = game.players.find(p => p.idPlayer !== Number(indexPlayer));
        
        if (!attacker || !enemy) return;
        
        // Check if it's attacker's turn
        if (game.currentPlayerIndex !== attacker.idPlayer) return;
        
        // Find a random cell that hasn't been attacked
        const availableCells = [];
        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 10; x++) {
                if (enemy.board[y][x] === null) {
                    availableCells.push({ x, y });
                }
            }
        }
        
        if (availableCells.length === 0) return;
        
        const randomCell = availableCells[Math.floor(Math.random() * availableCells.length)];
        
        // Use the same attack handler
        handleAttack(ws, JSON.stringify({
            gameId,
            x: randomCell.x,
            y: randomCell.y,
            indexPlayer
        }));
    } catch (error) {
        console.error('Error handling randomAttack:', error);
    }
}

// Main message handler
function handleMessage(ws, message) {
    try {
        const parsed = JSON.parse(message);
        const { type, data } = parsed;
        
        switch (type) {
            case 'reg':
                handleReg(ws, data);
                break;
            case 'create_room':
                handleCreateRoom(ws);
                break;
            case 'add_user_to_room':
                handleAddUserToRoom(ws, data);
                break;
            case 'add_ships':
                handleAddShips(ws, data);
                break;
            case 'attack':
                handleAttack(ws, data);
                break;
            case 'randomAttack':
                handleRandomAttack(ws, data);
                break;
            default:
                console.log('Unknown message type:', type);
        }
    } catch (error) {
        console.error('Error handling message:', error);
    }
}

// Connection cleanup
function handleDisconnect(ws) {
    const player = getPlayerByWs(ws);
    
    // Remove from rooms
    const room = getRoomByPlayer(ws);
    if (room) {
        room.roomUsers = room.roomUsers.filter(
            user => {
                const p = Array.from(players.entries()).find(([, pl]) => pl.index === user.index);
                return p && p[0] !== ws;
            }
        );
        if (room.roomUsers.length === 0) {
            rooms.delete(room.roomId);
        } else {
            broadcastUpdateRoom();
        }
    }
    
    // Remove from games
    const game = getGameByPlayer(ws);
    if (game) {
        games.delete(game.gameId);
    }
    
    // Remove player
    players.delete(ws);
    
    broadcastUpdateRoom();
}

const webSocketServer = {
    listen(port) {
        wss = new WebSocketServer({ port });

wss.on('connection', (ws) => {
    console.log('Client connected');
            
    ws.on('message', (message) => {
                handleMessage(ws, message.toString());
    });
            
    ws.on('close', () => {
        console.log('Client disconnected');
                handleDisconnect(ws);
            });
            
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
    });
});

        console.log(`WebSocket server started on port ${port}`);
    }
};

export { webSocketServer };