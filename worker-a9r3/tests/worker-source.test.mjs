import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
const config = fs.readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");

test("A9R3 is an isolated SQLite Durable Object with WebSocket Hibernation", () => {
  assert.match(config, /name = "momey-playable-a9r3-room"/);
  assert.match(config, /name = "ROOM_A9R3"/);
  assert.match(config, /class_name = "A9R3Room"/);
  assert.match(config, /new_sqlite_classes = \["A9R3Room"\]/);
  assert.match(source, /class A9R3Room extends DurableObject/);
  assert.match(source, /acceptWebSocket/);
  assert.match(source, /serializeAttachment/);
  assert.match(source, /setWebSocketAutoResponse/);
  assert.match(source, /storage\.sql/);
  assert.match(source, /async alarm\(\)/);
});

test("A9R3 room surface remains title-specific and CORS-bounded", () => {
  assert.match(source, /\/health/);
  assert.match(source, /\/rooms/);
  assert.doesNotMatch(source, /account|payment|matchmaking|analytics|chatMessage|genericScene/i);
  assert.match(source, /https:\/\/kafidog\.github\.io/);
});

test("successful live commands emit an explicit acknowledgement", () => {
  assert.match(source, /type:\s*"ACK"/);
  assert.match(source, /commandId/);
});

test("new WebSockets receive the private welcome token before room broadcast", () => {
  const handler = source.slice(source.indexOf("async handleWebSocket"), source.indexOf("async webSocketMessage"));
  assert.ok(handler.indexOf('type: "WELCOME"') < handler.indexOf("this.broadcast"));
});
