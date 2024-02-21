import { Player, RegistrationResponse, Room , Game } from "../types/gameTypes";

class inMemoryDB {
  private players: Player[] = [];
  private rooms: Room[] = [];
  private games: Game[] = [];
  private nextPlayerIndex = 1;
  private nextRoomId = 0;
  private nextGameId = 1;

  registerPlayer(data: { name: string; password: string }): RegistrationResponse {
    console.log(`Type of data: ${typeof data}`);
    const { name, password } = data;
    console.log(`name, password: ${data} ${name} ${password}`);
    

    // Check if player already exists
    const existingPlayer = this.players.find(player => player.name === name);
    if (existingPlayer) {
      return { name, index: existingPlayer.index, error: true, errorText: "Player already exists" };
    }

    // Register new player
    const index: number = this.nextPlayerIndex++;
    const newPlayer: Player = { name, index };
    this.players.push(newPlayer);

    return { name: newPlayer.name, index: newPlayer.index, error: false, errorText: '' };
  }

  createRoom(): Room {
    let room: Room = {};
    room = { roomId: this.nextRoomId++, roomUsers: [] };
    this.rooms.push(room);
    return room;
  }

  // updateRoom(player: Player) {
  //   const 
  //   return
  // }

  addPlayerToRoom(player: Player, roomId: number): Room | string {
    const room = this.rooms.find((room) => room.roomId === roomId);
    if (!room) {
      return 'Room not found';
    }

    room.roomUsers.push(player);
    return room;
  }

  startGame(roomId: number): Game | string {
    const room = this.rooms.find((room) => room.roomId === roomId);
    if (!room || room.roomUsers.length < 2) {
      return 'Room not found or not enough players';
    }

    const game: Game = { gameId: this.nextGameId++, players: room.roomUsers };
    this.games.push(game);
    return game;
  }

  getAllPlayers(): Player[] {
    return [...this.players];
  }

  getAllRooms(): Room[] {
    return [...this.rooms];
  }

  // findPlayerByWs(ws, players) {
  //     for (const name in players) {
  //       if (players.hasOwnProperty(name) && players[name].ws === ws) {
  //           return players[name]; // Return the player's data if the WebSocket matches
  //       }
  //   }
  //   return null;
  // };

  // Add more methods as necessary for gameplay
}

export { inMemoryDB };
