import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const workerRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(workerRoot, "src", "index.js"), "utf8");
const wrangler = fs.readFileSync(path.join(workerRoot, "wrangler.toml"), "utf8");
const engine = fs.readFileSync(path.join(workerRoot, "src", "engine.js"), "utf8");

test("A8 Worker remains an isolated SQLite Durable Object with WebSocket Hibernation", () => {
  assert.match(wrangler, /name\s*=\s*"momey-playable-a8-room"/);
  assert.match(wrangler, /compatibility_date\s*=\s*"2026-08-08"/);
  assert.match(wrangler, /class_name\s*=\s*"A8Room"/);
  assert.match(wrangler, /new_sqlite_classes\s*=\s*\["A8Room"\]/);
  assert.match(source, /export class A8Room extends DurableObject/);
  assert.match(source, /ctx\.storage\.sql\.exec/);
  assert.match(source, /acceptWebSocket\(server/);
  assert.match(source, /webSocketMessage\(ws, message\)/);
  assert.match(source, /webSocketClose\(ws\)/);
  assert.match(source, /setAlarm\(state\.expiresAt\)/);
  assert.match(source, /async alarm\(\)/);
  assert.match(source, /new Request\(target, request\)/);
  assert.match(source, /findAvailableRoomCode\(rng/);
  assert.doesNotMatch(source, /new Uint32Array\(2\)/);
  assert.match(source, /rngFromCrypto/);
});

test("A8 Worker keeps player projections free of technical implementation terms", () => {
  assert.doesNotMatch(source, /profile key|engine state/);
  assert.doesNotMatch(engine, /profile key|engine state/);
});

test("A8 Worker exposes only the title-specific room surface", () => {
  assert.match(source, /url\.pathname === "\/health"/);
  assert.match(source, /url\.pathname === "\/rooms" && request\.method === "POST"/);
  assert.ok(source.includes("const match = url.pathname.match"));
  assert.doesNotMatch(source, /GA4|analytics|acquisition|CMS|chat/i);
});
