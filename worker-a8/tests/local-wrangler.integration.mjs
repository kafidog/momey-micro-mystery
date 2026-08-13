import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.MOMEY_A8_TEST_PORT || 8787);
const BASE_URL = "http://127.0.0.1:" + PORT;
const WS_BASE_URL = "ws://127.0.0.1:" + PORT;
const ORIGIN = "http://127.0.0.1:1574";
const WRANGLER_ARGS = [
  "--yes",
  "wrangler@4.120.0",
  "dev",
  "--local",
  "--compatibility-date",
  "2026-08-08",
  "--ip",
  "127.0.0.1",
  "--port",
  String(PORT)
];
const WORKER_DIR = fileURLToPath(new URL("..", import.meta.url));
const NPX_CLI = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js");
const PROGRESS_PATH = process.env.MOMEY_A8_PROGRESS || "C:\\Users\\USER\\AppData\\Local\\Temp\\momey-a8-integration-progress.log";
const activeClients = new Set();

const logs = [];
let wranglerProcess;

function record(stream, chunk) {
  const line = String(chunk).trim();
  if (line) logs.push(stream + ": " + line);
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (wranglerProcess.exitCode !== null) {
      throw new Error("Wrangler exited before health check: " + logs.slice(-20).join("\n"));
    }
    try {
      const response = await fetch(BASE_URL + "/health");
      if (response.ok) {
        const payload = await response.json();
        assert.equal(payload.status, "ok");
        return;
      }
    } catch {
      // The local dev server is still booting.
    }
    await delay(250);
  }
  throw new Error("Wrangler health check timed out:\n" + logs.slice(-30).join("\n"));
}

async function createRoom() {
  const response = await fetch(BASE_URL + "/rooms", { method: "POST", headers: { Origin: ORIGIN } });
  const payload = await response.json();
  assert.equal(response.status, 201, JSON.stringify(payload));
  assert.equal(response.headers.get("access-control-allow-origin"), ORIGIN);
  assert.match(payload.roomCode, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  const snapshotResponse = await fetch(BASE_URL + "/rooms/" + payload.roomCode, { headers: { Origin: ORIGIN } });
  assert.equal(snapshotResponse.status, 200);
  assert.equal(snapshotResponse.headers.get("access-control-allow-origin"), ORIGIN);
  const snapshot = await snapshotResponse.json();
  assert.equal(snapshot.roomCode, payload.roomCode);
  assert.equal(snapshot.phase, "LOBBY");
  return payload.roomCode;
}

function waitUntil(predicate, label, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      try {
        const result = predicate();
        if (result) {
          clearInterval(timer);
          resolve(result);
          return;
        }
      } catch (error) {
        clearInterval(timer);
        reject(error);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        clearInterval(timer);
        reject(new Error("Timed out waiting for " + label));
      }
    }, 25);
  });
}

class TestClient {
  constructor(roomCode, roleId, token = null) {
    this.roomCode = roomCode;
    this.roleId = roleId;
    this.token = token;
    this.socket = null;
    this.state = null;
    this.messages = [];
    activeClients.add(this);
  }

  url() {
    const query = new URLSearchParams({ role: this.roleId });
    if (this.token) query.set("token", this.token);
    return WS_BASE_URL + "/rooms/" + this.roomCode + "/ws?" + query.toString();
  }

  async connect() {
    const socket = new WebSocket(this.url());
    this.socket = socket;
    return new Promise((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error("Timed out connecting " + this.roomCode + "/" + this.roleId));
        }
      }, 5000);
      socket.addEventListener("message", (event) => {
        let payload;
        try {
          payload = JSON.parse(String(event.data));
        } catch {
          return;
        }
        this.messages.push(payload);
        if (payload.state) this.state = payload.state;
        if (!settled && payload.type === "WELCOME") {
          settled = true;
          clearTimeout(timeout);
          this.token = payload.token;
          resolve(payload.state);
        }
      });
      socket.addEventListener("error", async () => {
        if (!settled) {
          await delay(350);
          settled = true;
          clearTimeout(timeout);
          reject(new Error("WebSocket connection failed for " + this.roomCode + "/" + this.roleId + "\n" + logs.slice(-30).join("\n")));
        }
      });
    });
  }

  close() {
    if (this.socket && this.socket.readyState < 2) this.socket.close(1000, "test close");
  }

  buildCommand(extra = {}) {
    return {
      type: extra.type,
      roleId: this.roleId,
      token: this.token,
      phase: this.state?.phase,
      version: this.state?.version,
      ...extra
    };
  }

  sendCommand(extra = {}) {
    assert.equal(this.socket?.readyState, 1, this.roleId + " socket should be open");
    this.socket.send(JSON.stringify(this.buildCommand(extra)));
  }

  sendRaw(value) {
    assert.equal(this.socket?.readyState, 1, this.roleId + " socket should be open");
    this.socket.send(value);
  }

  async commandAndWait(extra, label = extra.type) {
    const before = this.state.version;
    this.sendCommand(extra);
    await waitUntil(() => this.state && this.state.version > before, this.roleId + " " + label);
  }

  async expectError(payload, code) {
    const before = this.state?.version;
    const start = this.messages.length;
    if (typeof payload === "string") this.sendRaw(payload);
    else this.sendCommand(payload);
    const error = await waitUntil(
      () => this.messages.slice(start).find((message) => message.type === "ERROR" && message.code === code),
      this.roleId + " error " + code
    );
    await delay(75);
    assert.equal(this.state?.version, before, code + " must not mutate room state");
    return error;
  }
}

async function connectRoom(roomCode) {
  const clients = {
    operations: new TestClient(roomCode, "operations"),
    rescue: new TestClient(roomCode, "rescue"),
    safety: new TestClient(roomCode, "safety")
  };
  for (const roleId of ["operations", "rescue", "safety"]) {
    await clients[roleId].connect();
  }
  return clients;
}

async function waitRoomPhase(clients, phase) {
  await Promise.all(Object.values(clients).map((client) => waitUntil(
    () => client.state?.phase === phase,
    client.roomCode + "/" + client.roleId + " phase " + phase
  )));
}

async function takeoverRoom(clients) {
  for (const roleId of ["operations", "rescue", "safety"]) {
    await clients[roleId].commandAndWait({ type: "TAKEOVER" }, "TAKEOVER");
  }
}

async function completeOperator(client) {
  const eventId = client.state?.operatorEvent?.id;
  assert.ok(eventId, client.roleId + " should see an operator event");
  await client.commandAndWait({ type: "COMPLETE_OPERATOR", eventId }, "COMPLETE_OPERATOR " + eventId);
}

async function expectSocketRejected(roomCode, roleId) {
  const query = new URLSearchParams({ role: roleId });
  const socket = new WebSocket(WS_BASE_URL + "/rooms/" + roomCode + "/ws?" + query.toString());
  await Promise.race([
    new Promise((resolve, reject) => {
      socket.addEventListener("open", () => {
        socket.close(1000, "unexpected occupied connection");
        reject(new Error("Occupied role unexpectedly opened a WebSocket: " + roomCode + "/" + roleId));
      }, { once: true });
      socket.addEventListener("error", resolve, { once: true });
      socket.addEventListener("close", resolve, { once: true });
    }),
    delay(3000).then(() => {
      try { socket.close(1000, "rejection timeout"); } catch {}
      throw new Error("Expected occupied " + roomCode + "/" + roleId + " socket rejection");
    })
  ]);
}

async function run() {
  assert.equal(typeof WebSocket, "function", "Node WebSocket is required for local integration");
  const step = (label) => {
    const line = new Date().toISOString() + " [A8 local] " + label + "\n";
    fs.appendFileSync(PROGRESS_PATH, line, "utf8");
    console.log(line.trim());
  };
  fs.rmSync(PROGRESS_PATH, { force: true });
  step("start Wrangler");
  const wranglerExecutable = process.platform === "win32" ? process.execPath : "npx";
  const wranglerArgs = process.platform === "win32" ? [NPX_CLI, ...WRANGLER_ARGS] : WRANGLER_ARGS;
  wranglerProcess = spawn(wranglerExecutable, wranglerArgs, {
    cwd: WORKER_DIR,
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  wranglerProcess.stdout.on("data", (chunk) => record("stdout", chunk));
  wranglerProcess.stderr.on("data", (chunk) => record("stderr", chunk));
  await waitForHealth();
  step("health");

  const roomA = await createRoom();
  const roomB = await createRoom();
  step("created two rooms " + roomA + "," + roomB);
  assert.notEqual(roomA, roomB);
  const clientsA = await connectRoom(roomA);
  const clientsB = await connectRoom(roomB);
  step("connected six clients");
  assert.equal(clientsA.operations.state.audioMasterRole, "operations");
  assert.equal(clientsB.operations.state.audioMasterRole, "operations");

  await takeoverRoom(clientsB);
  step("room B intro started");
  const bToken = clientsB.operations.token;
  clientsB.operations.close();
  await waitUntil(() => clientsB.rescue.state.audioMasterRole === "rescue", "audio master reassignment");
  const bOperationsReconnect = new TestClient(roomB, "operations", bToken);
  await bOperationsReconnect.connect();
  assert.equal(bOperationsReconnect.token, bToken);
  clientsB.operations = bOperationsReconnect;
  step("room B master reassignment and reconnect");

  await takeoverRoom(clientsA);
  step("room A intro started");
  assert.equal(clientsA.operations.state.phase, "INTRO_1");
  for (let beat = 1; beat <= 8; beat += 1) {
    assert.equal(clientsA.operations.state.operatorEvent.id, "A8_INTRO_" + String(beat).padStart(2, "0"));
    await completeOperator(clientsA.operations);
  }
  await waitRoomPhase(clientsA, "ROUND1_ACTION");
  step("room A intro complete");
  assert.equal(clientsB.operations.state.phase, "INTRO_1");
  assert.doesNotMatch(JSON.stringify(clientsB.operations.state), new RegExp(roomA));

  const safety = clientsA.safety;
  const safetyVersion = safety.state.version;
  await safety.expectError({ type: "ACTION", actionId: "R1_S_HAZARD", version: safetyVersion - 1 }, "STALE_VERSION");
  await safety.expectError({ type: "ACTION", actionId: "R1_S_HAZARD", version: safetyVersion + 1 }, "FUTURE_VERSION");
  await safety.expectError({ type: "ACTION", actionId: "R1_S_HAZARD", phase: "INTRO_8" }, "STALE_PHASE");
  await safety.expectError({ type: "ACTION", actionId: "R1_S_HAZARD", phase: "ROUND1_DISCUSS" }, "FUTURE_PHASE");
  await safety.expectError({ type: "ACTION", actionId: "not-an-option" }, "MALFORMED_ACTION");
  await safety.expectError("{", "MALFORMED_MESSAGE");
  await clientsA.rescue.expectError({
    type: "ACTION",
    roleId: "operations",
    token: clientsA.operations.token,
    actionId: "R1_R_RAIL"
  }, "TOKEN_MISMATCH");

  await clientsA.operations.commandAndWait({ type: "ACTION", actionId: "R1_O_GATE" });
  step("room A first action");
  const duplicateVersion = clientsA.operations.state.version;
  await clientsA.operations.expectError({ type: "ACTION", actionId: "R1_O_GATE" }, "DUPLICATE_ACTION");
  assert.equal(clientsA.operations.state.version, duplicateVersion);
  await clientsA.rescue.commandAndWait({ type: "ACTION", actionId: "R1_R_RAIL" });
  await clientsA.safety.commandAndWait({ type: "ACTION", actionId: "R1_S_HAZARD" });
  await waitRoomPhase(clientsA, "ROUND1_DISCUSS");
  step("room A round 1 actions complete");
  assert.match(clientsA.operations.state.currentSeat.private.round1.found, /隔離閘/);
  assert.doesNotMatch(JSON.stringify(clientsA.rescue.state), /備用電力只夠撐 20 秒/);
  assert.doesNotMatch(JSON.stringify(clientsA.safety.state), /備用電力只夠撐 20 秒/);

  await clientsA.rescue.expectError({
    type: "COMPLETE_OPERATOR",
    eventId: clientsA.rescue.state.operatorEvent.id
  }, "NOT_AUDIO_MASTER");
  await clientsA.operations.expectError({
    type: "COMPLETE_OPERATOR",
    eventId: "A8_NOT_CURRENT"
  }, "WRONG_OPERATOR_EVENT");
  await completeOperator(clientsA.operations);
  for (const roleId of ["operations", "rescue", "safety"]) {
    await clientsA[roleId].commandAndWait({ type: "READY" });
  }
  await waitRoomPhase(clientsA, "ROUND2_ACTION");
  step("room A round 1 discussion complete");

  const reconnectedToken = clientsA.safety.token;
  clientsA.safety.close();
  const replacementSafety = new TestClient(roomA, "safety", reconnectedToken);
  await replacementSafety.connect();
  assert.equal(replacementSafety.token, reconnectedToken);
  assert.equal(replacementSafety.state.phase, "ROUND2_ACTION");
  assert.ok(replacementSafety.state.currentSeat.private.round1);
  assert.equal(replacementSafety.state.seats.find((seat) => seat.roleId === "safety").connected, true);
  clientsA.safety = replacementSafety;
  step("room A safety reconnected");

  for (const roleId of ["operations", "rescue", "safety"]) {
    const actionId = clientsA[roleId].state.options[0].id;
    await clientsA[roleId].commandAndWait({ type: "ACTION", actionId });
  }
  await waitRoomPhase(clientsA, "ROUND2_DISCUSS");
  step("room A round 2 actions complete");
  await completeOperator(clientsA.operations);
  for (const roleId of ["operations", "rescue", "safety"]) {
    await clientsA[roleId].commandAndWait({ type: "READY" });
  }
  await waitRoomPhase(clientsA, "ROUND3_ACTION");
  step("room A round 2 discussion complete");
  await completeOperator(clientsA.operations);
  for (const roleId of ["operations", "rescue", "safety"]) {
    const actionId = clientsA[roleId].state.options[0].id;
    await clientsA[roleId].commandAndWait({ type: "ACTION", actionId });
  }
  await waitRoomPhase(clientsA, "ROUND3_DISCUSS");
  step("room A round 3 actions complete");
  await completeOperator(clientsA.operations);
  for (const roleId of ["operations", "rescue", "safety"]) {
    await clientsA[roleId].commandAndWait({ type: "READY" });
  }
  await waitRoomPhase(clientsA, "FINAL_VOTE");
  step("room A round 3 discussion complete");
  for (const roleId of ["operations", "rescue", "safety"]) {
    await clientsA[roleId].commandAndWait({ type: "VOTE", vote: "close" });
  }
  await waitRoomPhase(clientsA, "ENDING");
  step("room A ending");
  const ending = clientsA.operations.state.ending;
  assert.equal(ending.reasons.length, 4);
  assert.doesNotMatch(JSON.stringify(ending.reasons), /R[123]_|A8_[A-Z0-9_]+|BREAKLINE|BACKWASH|round[123](?:Action|Result)|backupPower|gateStability|gaoProtection|rescueProgress/);

  step("check occupied WebSocket rejection");
  await expectSocketRejected(roomA, "operations");
  step("occupied WebSocket rejected");
  const roomBSnapshotResponse = await fetch(BASE_URL + "/rooms/" + roomB, { headers: { Origin: ORIGIN } });
  assert.equal(roomBSnapshotResponse.headers.get("access-control-allow-origin"), ORIGIN);
  const roomBSnapshot = await roomBSnapshotResponse.json();
  assert.equal(roomBSnapshot.phase, "INTRO_1");
  assert.notEqual(roomBSnapshot.roomCode, roomA);
  assert.equal(roomBSnapshot.ending, undefined);

  step("cross-room snapshot isolated");
  console.log("local Wrangler A8 integration PASS: rooms=" + roomA + "," + roomB + " clients=3+3 mainPath=ENDING reconnect=PASS audioMasterReassignment=PASS crossRoomIsolation=PASS");
}

try {
  await run();
} finally {
  for (const client of activeClients) client.close();
  if (wranglerProcess && wranglerProcess.exitCode === null) {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(wranglerProcess.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      wranglerProcess.kill("SIGTERM");
      await Promise.race([once(wranglerProcess, "exit"), delay(3000)]);
      if (wranglerProcess.exitCode === null) wranglerProcess.kill();
    }
  }
}
