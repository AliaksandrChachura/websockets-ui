interface Player {
  name: string;
  password: string;
  index?: number;
};

interface RegistrationResponse {
  name: string;
  index?: number;
  error: boolean;
  errorText?: string;
}

interface Room {
  roomId: number;
  roomUsers: Player[];
};

interface Game {
  gameId: number;
  players: Player[];
};

export type {
  Player,
  RegistrationResponse,
  Room,
  Game
}
