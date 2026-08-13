export const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function randomRoomCode(randomBytes = (length) => crypto.getRandomValues(new Uint8Array(length))) {
  let code = "";
  while (code.length < 6) {
    const bytes = randomBytes(6 - code.length);
    for (const value of bytes) {
      if (value >= 224) continue;
      code += ROOM_CODE_ALPHABET[value % ROOM_CODE_ALPHABET.length];
      if (code.length === 6) break;
    }
  }
  return code;
}

export function rngFromCrypto() {
  return (length) => crypto.getRandomValues(new Uint8Array(length));
}

export async function findAvailableRoomCode(randomBytes, allocate, attempts = 12) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const roomCode = randomRoomCode(randomBytes);
    const result = await allocate(roomCode);
    if (result?.created) return { roomCode, result };
  }
  return null;
}
