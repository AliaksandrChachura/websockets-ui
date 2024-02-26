import { Player, RegistrationResponse, Room , Game } from "../types/gameTypes";
import { generateRandomId } from "../utils/randomId";
class inMemoryDB {
  private players: Player[] = [];
  private rooms: Room[] = [];
  private games: Game[] = [];
  private currentPlayer: string;
  idPlayer: string;

  constructor() {
    this.idPlayer = this.currentPlayer;
  }

  registerPlayer(data: { name: string; password: string }): RegistrationResponse {
    const { name, password } = data;
    

    // Check if player already exists
    const existingPlayer = this.players.find(player => player.name === name);
    if (existingPlayer) {
      return { name, index: existingPlayer.index, error: true, errorText: "Player already exists" };
    }

    // Register new player
    const index: string = generateRandomId();
    this.setIdPlayer(index)
    const newPlayer: Player = { name, index };
    this.players.push(newPlayer);

    return { name: newPlayer.name, index: newPlayer.index, error: false, errorText: '' };
  }

  createRoom(): Room {
    let room: Room = {};
    room = { roomId: generateRandomId(), roomUsers: [] };
    this.rooms.push(room);
    return room;
  }

  addPlayerToRoom(player: Player, roomId: string): Room | string {
    const room = this.rooms.find((room) => room.roomId === roomId);
    if (!room) {
      return 'Room not found';
    }

    room.roomUsers.push(player);
    return room;
  }

  startGame(roomId: string): Game | string {
    const room = this.rooms.find((room) => room.roomId === roomId);
    if (!room || room.roomUsers.length < 2) {
      return 'Room not found or not enough players';
    }

    const game: Game = { gameId: generateRandomId(), players: room.roomUsers };
    this.games.push(game);
    return game;
  }

  getAllPlayers(): Player[] {
    return [...this.players];
  }

  getAllRooms(): Room[] {
    return [...this.rooms];
  }

  getAllGames(): Game[] {
    return [...this.games];
  }

  public getIdPlayer(): string {
    return this.idPlayer;
  }

  // Setter for idPlayer
  public setIdPlayer(value: string): void {
    this.idPlayer = value;
  }
}

export { inMemoryDB };
