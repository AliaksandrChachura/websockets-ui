interface Player {
  name: string;
  password?: string;
  index?: string;
};

interface RegistrationResponse {
  name: string;
  index?: string;
  error: boolean;
  errorText?: string;
}

interface Room {
  roomId?: string;
  roomUsers?: Player[];
};

interface Game {
  gameId: string;
  players: Player[];
};

export type {
  Player,
  RegistrationResponse,
  Room,
  Game
}
