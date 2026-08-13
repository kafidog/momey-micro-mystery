import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.MOMEY_A9_TEST_PORT || 8790);
const REMOTE = String(process.env.MOMEY_A9_REMOTE_URL || "").replace(/\/$/, "");
const BASE = REMOTE || `http://127.0.0.1:${PORT}`;
const WS_BASE = BASE.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
const ORIGIN = process.env.MOMEY_A9_TEST_ORIGIN || (REMOTE ? "https://kafidog.github.io" : "http://127.0.0.1:1590");
const WORKER_DIR = fileURLToPath(new URL("..", import.meta.url));
const NPX_CLI = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js");
const logs = [];
const clients = new Set();
let worker = null;

async function health() {
  for (let i = 0; i < 80; i += 1) {
    try { const response = await fetch(BASE + "/health"); if (response.ok) return; } catch {}
    if (worker && worker.exitCode !== null) throw new Error("Wrangler exited: " + logs.slice(-20).join("\n"));
    await delay(250);
  }
  throw new Error("health timeout: " + logs.slice(-20).join("\n"));
}

async function createRoom() {
  const response = await fetch(BASE + "/rooms", { method: "POST", headers: { Origin: ORIGIN } });
  const payload = await response.json();
  assert.equal(response.status, 201, JSON.stringify(payload));
  assert.equal(response.headers.get("access-control-allow-origin"), ORIGIN);
  assert.match(payload.roomCode, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  return payload.roomCode;
}

class Client {
  constructor(code, role, token = null) { this.code = code; this.role = role; this.token = token; this.state = null; this.errors = []; this.socket = null; }
  async connect() {
    const query = new URLSearchParams({ role: this.role }); if (this.token) query.set("token", this.token);
    this.socket = new WebSocket(`${WS_BASE}/rooms/${this.code}/ws?${query}`);
    clients.add(this);
    this.socket.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "WELCOME") { this.token = payload.token; this.state = payload.state; }
      if (payload.type === "STATE") this.state = payload.state;
      if (payload.type === "ERROR") this.errors.push(payload);
    });
    await this.wait(() => this.token && this.state, "welcome");
    return this;
  }
  async wait(predicate, label, timeout = REMOTE ? 15000 : 6000) {
    const started = Date.now();
    while (Date.now() - started < timeout) { if (predicate()) return; await delay(25); }
    throw new Error(`${this.role} ${label} timeout; state=${JSON.stringify(this.state)} errors=${JSON.stringify(this.errors)}`);
  }
  async command(type, extra = {}) {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const before = this.state.version;
      const errorCount = this.errors.length;
      this.socket.send(JSON.stringify({ type, roleId: this.role, token: this.token, phase: this.state.phase, version: before, ...extra }));
      await this.wait(() => this.state.version > before || this.errors.length > errorCount, type);
      if (this.state.version > before) return;
      const error = this.errors[this.errors.length - 1];
      if (!/^STALE_/.test(error.code)) throw new Error(`${type} rejected: ${JSON.stringify(error)}`);
      await delay(50);
    }
    throw new Error(`${type} could not converge`);
  }
  close() { try { this.socket?.close(1000, "test"); } catch {} }
}

async function converge(group, label) {
  const started = Date.now();
  while (Date.now() - started < (REMOTE ? 15000 : 6000)) {
    const versions = group.map((client) => client.state?.version);
    if (versions.every(Number.isInteger) && new Set(versions).size === 1) return;
    await delay(30);
  }
  throw new Error(`${label} did not converge: ${group.map((client) => client.state?.version)}`);
}

async function run() {
  if (!REMOTE) {
    worker = spawn(process.execPath, [NPX_CLI, "--yes", "wrangler@4.120.0", "dev", "--local", "--ip", "127.0.0.1", "--port", String(PORT)], { cwd: WORKER_DIR, stdio: ["ignore", "pipe", "pipe"] });
    worker.stdout.on("data", (chunk) => logs.push("out: " + String(chunk).trim()));
    worker.stderr.on("data", (chunk) => logs.push("err: " + String(chunk).trim()));
  }
  await health();
  const roomA = await createRoom();
  const roomB = await createRoom();
  assert.notEqual(roomA, roomB);
  const groupA = await Promise.all([new Client(roomA, "operations").connect(), new Client(roomA, "rescue").connect(), new Client(roomA, "safety").connect()]);
  const groupB = await Promise.all([new Client(roomB, "operations").connect(), new Client(roomB, "rescue").connect(), new Client(roomB, "safety").connect()]);
  for (const client of groupA) { await converge(groupA, "before takeover"); await client.command("TAKEOVER"); }
  await converge(groupA, "takeovers");
  assert.equal(groupA[0].state.phase, "INTRO");
  const introMasterRole = groupA[0].state.audioMasterRole;
  const introMaster = groupA.find((client) => client.role === introMasterRole);
  await introMaster.command("COMPLETE_OPERATOR", { eventId: "A9_INTRO" });
  for (const client of groupA) { await converge(groupA, "before training"); await client.command("TRAIN"); }
  await converge(groupA, "training");
  assert.equal(groupA[0].state.phase, "WINDOW1");

  await groupA[0].command("SET_POWER", { mode: "gate" }); await converge(groupA, "gate power");
  assert.equal(groupA[1].state.control.railPowered, false);
  await groupA[0].command("SET_POWER", { mode: "rail" }); await converge(groupA, "rail power");
  assert.equal(groupA[1].state.control.railPowered, true);
  assert.equal(groupA[2].state.control.pressureTrend, "快速上升");
  await groupA[2].command("BRACE_START"); await converge(groupA, "brace");
  assert.equal(groupA[0].state.control.safetySupportCoarse, "有人撐住");
  await groupA[1].command("TROLLEY_START");
  await groupA[1].wait(() => groupA[1].state.control.positionExact > 0, "trolley movement", REMOTE ? 15000 : 7000);
  await converge(groupA, "checkpoint effect");
  assert.ok(groupA[0].state.shared.trolley !== "起點" || groupA[1].state.control.positionExact > 0);

  const rescueToken = groupA[1].token;
  groupA[1].close();
  await groupA[0].wait(() => /安全放開/.test(groupA[0].state.shared.latestMajorEvent), "disconnect neutral");
  const replacement = await new Client(roomA, "rescue", rescueToken).connect();
  groupA[1] = replacement;
  assert.equal(replacement.state.currentSeat.roleId, "rescue");
  assert.ok(replacement.state.control.positionExact > 0);

  assert.equal(groupB[0].state.phase, "LOBBY");
  assert.equal(groupB[0].state.shared.latestMajorEvent, "三支手機已連上同一場事件。");
  assert.equal(groupB[0].state.shared.trolley, "起點");
  console.log(`A9 realtime PASS: mode=${REMOTE ? "remote" : "local"} rooms=${roomA},${roomB} clients=3+3 cross-links=4 reconnect=PASS cross-room=PASS`);
}

try { await run(); } finally {
  for (const client of clients) client.close();
  if (worker && process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(worker.pid), "/T", "/F"], { stdio: "ignore" });
  } else if (worker) {
    worker.kill("SIGTERM");
    await delay(300);
    if (worker.exitCode === null) worker.kill("SIGKILL");
  }
}
