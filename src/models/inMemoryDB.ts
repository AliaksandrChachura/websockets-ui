import { Player, RegistrationResponse, Room , Game } from "../types/gameTypes";

class inMemoryDB {
  private players: Player[] = [];
  private rooms: Room[] = [];
  private games: Game[] = [];
  private nextPlayerIndex = 1;
  private nextRoomId = 1;
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
    const newIndex = this.nextPlayerIndex++;
    const newPlayer: Player = { name, password };
    this.players.push(newPlayer);

    return { name: newPlayer.name, error: false };
  }

  createRoom(player: Player): Room {
    const room: Room = { roomId: this.nextRoomId++, roomUsers: [player] };
    this.rooms.push(room);
    return room;
  }

  updateRoom() {}

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

  // Add more methods as necessary for gameplay
}

export { inMemoryDB };
