import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
const config = fs.readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");

test("A9 is an isolated SQLite Durable Object with WebSocket Hibernation", () => {
  assert.match(config, /name = "momey-playable-a9-room"/);
  assert.match(config, /class_name = "A9Room"/);
  assert.match(config, /new_sqlite_classes = \["A9Room"\]/);
  assert.match(source, /class A9Room extends DurableObject/);
  assert.match(source, /acceptWebSocket/);
  assert.match(source, /serializeAttachment/);
  assert.match(source, /setWebSocketAutoResponse/);
  assert.match(source, /storage\.sql/);
  assert.match(source, /async alarm\(\)/);
});

test("A9 room surface remains title-specific and CORS-bounded", () => {
  assert.match(source, /\/health/);
  assert.match(source, /\/rooms/);
  assert.doesNotMatch(source, /account|payment|matchmaking|analytics|chatMessage|genericScene/i);
  assert.match(source, /https:\/\/kafidog\.github\.io/);
});

test("successful live commands emit an explicit acknowledgement", () => {
  assert.match(source, /type:\s*"ACK"/);
  assert.match(source, /commandId/);
});
