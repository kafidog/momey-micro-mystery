import { randomRoomCode } from "./engine.js";

// The Worker asks for a new Uint32 for every room-code character.  Keeping
// this seam small also lets the source tests prove that a collision retry is
// fed by fresh entropy rather than a two-value cycle.
export function rngFromCrypto(getRandomValues = null) {
  const fill = getRandomValues || ((values) => crypto.getRandomValues(values));
  return () => {
    const value = new Uint32Array(1);
    fill(value);
    return value[0] / 0x100000000;
  };
}

export async function findAvailableRoomCode(random, initialize, maxAttempts = 8) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const roomCode = randomRoomCode(random);
    const result = await initialize(roomCode);
    if (result && result.created !== false) return { roomCode, result };
  }
  return null;
}
