import { Player, RegistrationResponse } from '../types/gameTypes'

const players: Player[] = [];
let nextIndex = 1;

const registerPlayer = (data: { name: string; password: string }): RegistrationResponse => {
  // const parsedData = JSON.stringify(data);
  console.log(`Type of data: ${typeof data}`);
  const { name, password } = data;
  console.log(`name, password: ${data} ${name} ${password}`);
  

  // Check if player already exists
  const existingPlayer = players.find(player => player.name === name);
  if (existingPlayer) {
    return { name, index: existingPlayer.index, error: true, errorText: "Player already exists" };
  }

  // Register new player
  const newIndex = nextIndex++;
  const newPlayer: Player = { name, password };
  players.push(newPlayer);

  return { name: newPlayer.name, error: false };
}
// const handleRegistration = (name: string, password: string, players: Player[]) => {
//   // Check if the player already exists
//   const existingPlayerIndex = players.findIndex(player => player.name === name);
//   if (existingPlayerIndex !== -1) {
//     // Player exists, check password
//     if (players[existingPlayerIndex].password === password) {
//       return { ...players[existingPlayerIndex], error: false, errorText: "" };
//     } else {
//       return { error: true, errorText: "Incorrect password" };
//     }
//   } else {
//     // New player, add to the list
//     const player = { name, password, index: players.length + 1 };
//     players.push(player);
//     return { ...player, error: false, errorText: "" };
//   }
// }

export { players, registerPlayer };
