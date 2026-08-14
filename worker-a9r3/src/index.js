import { DurableObject } from "cloudflare:workers";
import {
  A9R3_SCHEMA,
  LIVE_PHASES,
  ROLE_IDS,
  ROOM_CODE_ALPHABET,
  applyCommand,
  connectSeat,
  createRoom,
  disconnectSeat,
  isExpired,
  materialize,
  projectRoomState,
  publicLobbyState
} from "./engine.js";
import { findAvailableRoomCode, rngFromCrypto } from "./room-code.js";

const ROOM_CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{6}$`);
const STORAGE_TABLE = "a9r3_room_state";
const ALLOWED_ORIGINS = new Set([
  "https://kafidog.github.io",
  "http://127.0.0.1:1590",
  "http://127.0.0.1:8790",
  "http://localhost:1590",
  "http://localhost:8790"
]);

function originAllowed(request) {
  const origin = request.headers.get("Origin");
  return !origin || ALLOWED_ORIGINS.has(origin);
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  const headers = { "Cache-Control": "no-store", "Cross-Origin-Resource-Policy": "cross-origin", Vary: "Origin" };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return headers;
}

function jsonResponse(request, payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders(request), "Content-Type": "application/json; charset=utf-8" } });
}

function textResponse(request, text, status = 200) {
  return new Response(text, { status, headers: corsHeaders(request) });
}

function normalizeCode(raw) {
  const code = String(raw || "").trim().toUpperCase();
  return ROOM_CODE_PATTERN.test(code) ? code : null;
}

function newOpaqueToken() { return crypto.randomUUID(); }

function errorStatus(code) {
  if (code === "EXPIRED_ROOM") return 410;
  if (["SEAT_ALREADY_CONNECTED", "TOKEN_MISMATCH", "STALE_PHASE", "STALE_VERSION", "FUTURE_PHASE", "FUTURE_VERSION", "DUPLICATE_ACTION", "WRONG_ROLE", "IMPOSSIBLE_CONTROL", "NOT_AUDIO_MASTER", "WRONG_OPERATOR_EVENT"].includes(code)) return 409;
  return 400;
}

function tableSql() {
  return `CREATE TABLE IF NOT EXISTS ${STORAGE_TABLE} (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    state_json TEXT NOT NULL,
    schema TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`;
}

export class A9R3Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
    this.ctx.storage.sql.exec(tableSql());
    if (typeof WebSocketRequestResponsePair !== "undefined") {
      this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
    }
  }

  loadState() {
    const rows = this.ctx.storage.sql.exec(`SELECT state_json FROM ${STORAGE_TABLE} WHERE id = 1`).toArray();
    if (!rows.length) return null;
    try { return JSON.parse(rows[0].state_json); } catch { return null; }
  }

  saveState(state) {
    this.ctx.storage.sql.exec(
      `INSERT INTO ${STORAGE_TABLE} (id, state_json, schema, updated_at)
       VALUES (1, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET state_json = excluded.state_json, schema = excluded.schema, updated_at = excluded.updated_at`,
      JSON.stringify(state), A9R3_SCHEMA, Date.now()
    );
  }

  async schedule(state, now = Date.now()) {
    const next = LIVE_PHASES.includes(state.phase) && state.deadlineAt
      ? Math.min(state.expiresAt, state.deadlineAt, now + 1000)
      : state.expiresAt;
    await this.ctx.storage.setAlarm(next);
  }

  async ensureInitialized(roomCode) {
    let state = this.loadState();
    if (!state) {
      if (!roomCode) throw new Error("MISSING_ROOM_CODE");
      state = createRoom({ roomCode, now: Date.now() });
      this.saveState(state);
      await this.schedule(state);
      return { state, created: true };
    }
    return { state, created: false };
  }

  send(ws, payload) { try { ws.send(JSON.stringify(payload)); } catch {} }

  sendError(ws, state, code, message) {
    this.send(ws, { type: "ERROR", code, message, phase: state?.phase || null, version: state?.version ?? null });
  }

  broadcast(state, now = Date.now()) {
    for (const ws of this.ctx.getWebSockets()) {
      let attachment;
      try { attachment = ws.deserializeAttachment(); } catch { attachment = null; }
      if (!attachment || !ROLE_IDS.includes(attachment.roleId)) continue;
      this.send(ws, { type: "STATE", state: projectRoomState(state, attachment.roleId, now) });
    }
  }

  async persistAndBroadcast(state, now = Date.now()) {
    this.saveState(state);
    await this.schedule(state, now);
    this.broadcast(state, now);
  }

  async handleInit(request, url) {
    const roomCode = normalizeCode(url.searchParams.get("roomCode"));
    if (!roomCode) return jsonResponse(request, { error: "INVALID_ROOM_CODE" }, 400);
    const result = await this.ensureInitialized(roomCode);
    if (isExpired(result.state)) return jsonResponse(request, { error: "EXPIRED_ROOM" }, 410);
    return jsonResponse(request, { ...publicLobbyState(result.state), created: result.created });
  }

  async handleSnapshot(request) {
    const state = this.loadState();
    if (!state) return jsonResponse(request, { error: "ROOM_NOT_FOUND" }, 404);
    if (isExpired(state)) return jsonResponse(request, { error: "EXPIRED_ROOM" }, 410);
    return jsonResponse(request, publicLobbyState(state));
  }

  findSocket(roleId, token) {
    for (const ws of this.ctx.getWebSockets()) {
      try {
        const attachment = ws.deserializeAttachment();
        if (attachment?.roleId === roleId && attachment?.token === token) return ws;
      } catch {}
    }
    return null;
  }

  async handleWebSocket(request, url) {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return textResponse(request, "WebSocket upgrade required", 426);
    const state = this.loadState();
    if (!state) return jsonResponse(request, { error: "ROOM_NOT_FOUND" }, 404);
    if (isExpired(state)) return jsonResponse(request, { error: "EXPIRED_ROOM" }, 410);
    const roleId = url.searchParams.get("role");
    const token = url.searchParams.get("token") || null;
    if (!ROLE_IDS.includes(roleId)) return jsonResponse(request, { error: "UNKNOWN_ROLE" }, 400);
    if (token) {
      const oldSocket = this.findSocket(roleId, token);
      if (oldSocket) try { oldSocket.close(4000, "reconnected"); } catch {}
    }
    const connectionId = newOpaqueToken();
    const result = connectSeat(state, { roleId, token, newToken: newOpaqueToken(), connectionId, now: Date.now() });
    if (!result.ok) return jsonResponse(request, { error: result.code, message: result.message }, errorStatus(result.code));
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server, [roleId]);
    server.serializeAttachment({ roleId, token: result.token, connectionId });
    this.saveState(result.state);
    this.send(server, { type: "WELCOME", token: result.token, roleId, state: projectRoomState(result.state, roleId) });
    this.broadcast(result.state);
    await this.schedule(result.state);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    const state = this.loadState();
    if (!state) return this.sendError(ws, null, "ROOM_NOT_FOUND", "找不到這個事件。 ");
    let attachment;
    try { attachment = ws.deserializeAttachment(); } catch { attachment = null; }
    if (!attachment || !ROLE_IDS.includes(attachment.roleId) || typeof attachment.token !== "string") return this.sendError(ws, state, "TOKEN_MISMATCH", "角色連結已失效。 ");
    if (typeof message !== "string" || message.length === 0 || message.length > 4096) return this.sendError(ws, state, "MALFORMED_MESSAGE", "控制資料不完整。 ");
    let command;
    try { command = JSON.parse(message); } catch { return this.sendError(ws, state, "MALFORMED_MESSAGE", "控制資料不完整。 "); }
    if (!command || typeof command !== "object" || Array.isArray(command)) return this.sendError(ws, state, "MALFORMED_COMMAND", "控制資料不完整。 ");
    if (command.roleId !== attachment.roleId || command.token !== attachment.token) return this.sendError(ws, state, "TOKEN_MISMATCH", "這支手機不能操作另一個角色。 ");
    const result = applyCommand(state, command, Date.now());
    if (!result.ok) {
      this.sendError(ws, state, result.code, result.message);
      this.send(ws, { type: "STATE", state: projectRoomState(state, attachment.roleId) });
      return;
    }
    await this.persistAndBroadcast(result.state);
    this.send(ws, { type: "ACK", commandId: typeof command.commandId === "string" ? command.commandId : null });
  }

  async webSocketClose(ws) {
    let attachment;
    try { attachment = ws.deserializeAttachment(); } catch { attachment = null; }
    if (!attachment || !ROLE_IDS.includes(attachment.roleId)) return;
    const state = this.loadState();
    if (!state || isExpired(state)) return;
    const result = disconnectSeat(state, { roleId: attachment.roleId, connectionId: attachment.connectionId, now: Date.now() });
    if (JSON.stringify(result.state) === JSON.stringify(state)) return;
    await this.persistAndBroadcast(result.state);
  }

  async alarm() {
    const state = this.loadState();
    if (!state) return;
    const now = Date.now();
    if (isExpired(state, now)) {
      for (const ws of this.ctx.getWebSockets()) try { ws.close(4001, "expired"); } catch {}
      this.ctx.storage.sql.exec(`DELETE FROM ${STORAGE_TABLE}`);
      return;
    }
    const next = materialize(state, now);
    if (JSON.stringify(next) !== JSON.stringify(state)) {
      next.version = state.version + 1;
      this.saveState(next);
      this.broadcast(next, now);
    }
    await this.schedule(next, now);
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/init" && request.method === "POST") return this.handleInit(request, url);
    if (url.pathname === "/snapshot" && request.method === "GET") return this.handleSnapshot(request);
    if (url.pathname === "/ws" && request.method === "GET") return this.handleWebSocket(request, url);
    return textResponse(request, "Not found", 404);
  }
}

async function initRoom(env, roomCode) {
  const id = env.ROOM_A9R3.idFromName(`a9r3:${roomCode}`);
  const response = await env.ROOM_A9R3.get(id).fetch(`https://a9r3-room.internal/init?roomCode=${roomCode}`, { method: "POST" });
  return response.json();
}

function roomFetch(env, roomCode, path, request = null) {
  const id = env.ROOM_A9R3.idFromName(`a9r3:${roomCode}`);
  const target = new URL(`https://a9r3-room.internal${path}`);
  return env.ROOM_A9R3.get(id).fetch(request ? new Request(target, request) : new Request(target));
}

export default {
  async fetch(request, env) {
    if (!originAllowed(request)) return textResponse(request, "Origin not allowed", 403);
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
    if (url.pathname === "/health" && request.method === "GET") return jsonResponse(request, { service: "momey-playable-a9r3-room", schema: A9R3_SCHEMA, status: "ok" });
    if (url.pathname === "/rooms" && request.method === "POST") {
      const allocation = await findAvailableRoomCode(rngFromCrypto(), (roomCode) => initRoom(env, roomCode));
      return allocation ? jsonResponse(request, { roomCode: allocation.roomCode, sharePath: `/playable-a9r3/?room=${allocation.roomCode}` }, 201) : jsonResponse(request, { error: "ROOM_CODE_UNAVAILABLE" }, 503);
    }
    const match = url.pathname.match(/^\/rooms\/([^/]+)(\/ws)?$/);
    if (!match) return textResponse(request, "Not found", 404);
    const roomCode = normalizeCode(match[1]);
    if (!roomCode) return jsonResponse(request, { error: "INVALID_ROOM_CODE" }, 400);
    if (match[2]) {
      const query = new URLSearchParams({ role: url.searchParams.get("role") || "" });
      if (url.searchParams.get("token")) query.set("token", url.searchParams.get("token"));
      return roomFetch(env, roomCode, `/ws?${query}`, request);
    }
    if (request.method === "GET") return roomFetch(env, roomCode, "/snapshot", request);
    return textResponse(request, "Method not allowed", 405);
  }
};
