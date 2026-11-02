import { Room } from "../../src/domain/room";
export function restoredPartySavings(
  room: Room,
  tokens: string[],
  coins = 100,
): Room {
  const archive = room.export();
  for (const account of Object.values(archive.party!.balances))
    account.coins = coins;
  const restored = Room.restore(archive);
  tokens.forEach((token) => restored.claim("", token));
  return restored;
}
