import assert from "node:assert/strict";
import test from "node:test";
import { findAvailableRoomCode, rngFromCrypto } from "../src/room-code.js";

test("crypto room-code source draws fresh independent entropy for every character", () => {
  const values = Array.from({ length: 6 }, (_, index) => new Uint32Array([index * 0x10000000]));
  let draws = 0;
  const random = rngFromCrypto((target) => {
    target[0] = values[draws][0];
    draws += 1;
  });
  const code = Array.from({ length: 6 }, () => random());
  assert.equal(draws, 6);
  assert.notDeepEqual(code, [code[0], code[0], code[0], code[0], code[0], code[0]]);
  assert.notDeepEqual(code, [code[0], code[1], code[0], code[1], code[0], code[1]]);
  assert.equal(values.length, 6);
});

test("room-code collision retry consumes a new six-draw sequence", async () => {
  const draws = [
    0, 0, 0, 0, 0, 0,
    0.1, 0.2, 0.3, 0.4, 0.5, 0.6
  ];
  let cursor = 0;
  const attempted = [];
  const allocation = await findAvailableRoomCode(
    () => draws[cursor++],
    async (roomCode) => {
      attempted.push(roomCode);
      return { created: attempted.length > 1 };
    },
    3
  );
  assert.ok(allocation);
  assert.equal(attempted.length, 2);
  assert.notEqual(attempted[0], attempted[1]);
  assert.equal(allocation.roomCode, attempted[1]);
  assert.equal(cursor, 12);
});
