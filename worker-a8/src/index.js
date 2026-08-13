import { DurableObject } from "cloudflare:workers";
import {
  A8_SCHEMA,
  ROLE_IDS,
  ROOM_CODE_ALPHABET,
  applyCommand,
  connectSeat,
  createRoom,
  disconnectSeat,
  isExpired,
  projectRoomState,
  publicLobbyState,
  randomProfile
} from "./engine.js";
import { findAvailableRoomCode, rngFromCrypto } from "./room-code.js";

const ROOM_CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{6}$`);
const STORAGE_TABLE = "a8_room_state";
const ALLOWED_ORIGINS = new Set([
  "https://kafidog.github.io",
  "http://127.0.0.1:1574",
  "http://127.0.0.1:8787",
  "http://localhost:1574",
  "http://localhost:8787"
]);

function originAllowed(request) {
  const origin = request.headers.get("Origin");
  return !origin || ALLOWED_ORIGINS.has(origin);
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  const headers = {
    "Cache-Control": "no-store",
    "Cross-Origin-Resource-Policy": "cross-origin",
    Vary: "Origin"
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return headers;
}

function jsonResponse(request, payload, status = 200, extra = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      ...extra
    }
  });
}

function textResponse(request, text, status) {
  return new Response(text, {
    status,
    headers: corsHeaders(request)
  });
}

function errorStatus(code) {
  if (code === "EXPIRED_ROOM") return 410;
  if (["OCCUPIED_ROLE", "TOKEN_MISMATCH", "SEAT_ALREADY_CONNECTED", "STALE_PHASE", "STALE_VERSION", "FUTURE_PHASE", "FUTURE_VERSION", "DUPLICATE_ACTION", "OPERATOR_PENDING", "NOT_AUDIO_MASTER", "WRONG_OPERATOR_EVENT"].includes(code)) return 409;
  return 400;
}

function normalizeCode(raw) {
  const code = String(raw || "").trim().toUpperCase();
  return ROOM_CODE_PATTERN.test(code) ? code : null;
}

function newOpaqueToken() {
  return crypto.randomUUID();
}

function tableSql() {
  return `CREATE TABLE IF NOT EXISTS ${STORAGE_TABLE} (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    state_json TEXT NOT NULL,
    schema TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`;
}

export class A8Room extends DurableObject {
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
    try {
      return JSON.parse(rows[0].state_json);
    } catch {
      return null;
    }
  }

  saveState(state) {
    this.ctx.storage.sql.exec(
      `INSERT INTO ${STORAGE_TABLE} (id, state_json, schema, updated_at)
       VALUES (1, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET state_json = excluded.state_json, schema = excluded.schema, updated_at = excluded.updated_at`,
      JSON.stringify(state),
      A8_SCHEMA,
      Date.now()
    );
  }

  async scheduleExpiry(state) {
    await this.ctx.storage.setAlarm(state.expiresAt);
  }

  async ensureInitialized(profile = "BREAKLINE", roomCode = null) {
    let state = this.loadState();
    if (!state) {
      if (!roomCode) throw new Error("MISSING_ROOM_CODE");
      state = createRoom({ roomCode, profile, now: Date.now() });
      this.saveState(state);
      await this.scheduleExpiry(state);
      return { state, created: true };
    }
    if (isExpired(state)) {
      return { state, created: false };
    }
    await this.scheduleExpiry(state);
    return { state, created: false };
  }

  send(ws, payload) {
    try {
      ws.send(JSON.stringify(payload));
    } catch {
      // The close callback will clean up the authoritative connection mark.
    }
  }

  sendError(ws, state, code, message) {
    this.send(ws, {
      type: "ERROR",
      code,
      message,
      phase: state?.phase || null,
      version: state?.version ?? null
    });
  }

  broadcast(state) {
    for (const ws of this.ctx.getWebSockets()) {
      let attachment = null;
      try {
        attachment = ws.deserializeAttachment();
      } catch {
        attachment = null;
      }
      if (!attachment || !ROLE_IDS.includes(attachment.roleId)) continue;
      this.send(ws, {
        type: "STATE",
        state: projectRoomState(state, attachment.roleId)
      });
    }
  }

  async persistAndBroadcast(state) {
    this.saveState(state);
    await this.scheduleExpiry(state);
    this.broadcast(state);
  }

  async handleInit(request, url) {
    const roomCode = normalizeCode(url.searchParams.get("roomCode"));
    const profile = url.searchParams.get("profile") || "BREAKLINE";
    if (!roomCode) return jsonResponse(request, { error: "INVALID_ROOM_CODE" }, 400);
    try {
      const result = await this.ensureInitialized(profile, roomCode);
      if (isExpired(result.state)) return jsonResponse(request, { error: "EXPIRED_ROOM" }, 410);
      return jsonResponse(request, { ...publicLobbyState(result.state), created: result.created });
    } catch (error) {
      return jsonResponse(request, { error: error.message || "INIT_FAILED" }, 400);
    }
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
      } catch {
        // Ignore a socket whose attachment disappeared during close.
      }
    }
    return null;
  }

  async handleWebSocket(request, url) {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return textResponse(request, "WebSocket upgrade required", 426);
    }
    const state = this.loadState();
    if (!state) return jsonResponse(request, { error: "ROOM_NOT_FOUND" }, 404);
    if (isExpired(state)) return jsonResponse(request, { error: "EXPIRED_ROOM" }, 410);
    const roleId = url.searchParams.get("role");
    const token = url.searchParams.get("token") || null;
    if (!ROLE_IDS.includes(roleId)) return jsonResponse(request, { error: "UNKNOWN_ROLE" }, 400);
    if (token) {
      const oldSocket = this.findSocket(roleId, token);
      if (oldSocket) {
        try {
          oldSocket.close(4000, "reconnected");
        } catch {
          // The new connection still wins through its connectionId.
        }
      }
    }
    const connectionId = newOpaqueToken();
    const result = connectSeat(state, {
      roleId,
      token,
      newToken: newOpaqueToken(),
      connectionId,
      now: Date.now(),
      forceReconnect: Boolean(token)
    });
    if (!result.ok) return jsonResponse(request, { error: result.code, message: result.message }, errorStatus(result.code));

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server, [roleId]);
    server.serializeAttachment({ roleId, token: result.token, connectionId });
    await this.persistAndBroadcast(result.state);
    this.send(server, {
      type: "WELCOME",
      token: result.token,
      roleId,
      state: projectRoomState(result.state, roleId)
    });
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    const state = this.loadState();
    if (!state) {
      this.sendError(ws, null, "ROOM_NOT_FOUND", "找不到這個事件。");
      return;
    }
    let attachment;
    try {
      attachment = ws.deserializeAttachment();
    } catch {
      attachment = null;
    }
    if (!attachment || !ROLE_IDS.includes(attachment.roleId) || typeof attachment.token !== "string") {
      this.sendError(ws, state, "TOKEN_MISMATCH", "這支手機的角色連結已失效。");
      return;
    }
    if (typeof message !== "string" || message.length === 0 || message.length > 4096) {
      this.sendError(ws, state, "MALFORMED_MESSAGE", "這個動作資料不完整。");
      return;
    }
    let command;
    try {
      command = JSON.parse(message);
    } catch {
      this.sendError(ws, state, "MALFORMED_MESSAGE", "這個動作資料不完整。");
      return;
    }
    if (!command || typeof command !== "object" || Array.isArray(command)) {
      this.sendError(ws, state, "MALFORMED_COMMAND", "這個動作資料不完整。");
      return;
    }
    if (command.roleId !== attachment.roleId || command.token !== attachment.token) {
      this.sendError(ws, state, "TOKEN_MISMATCH", "這支手機不能操作另一個角色。");
      return;
    }
    const result = applyCommand(state, command, Date.now());
    if (!result.ok) {
      this.sendError(ws, state, result.code, result.message);
      this.send(ws, {
        type: "STATE",
        state: projectRoomState(state, attachment.roleId)
      });
      return;
    }
    await this.persistAndBroadcast(result.state);
  }

  async webSocketClose(ws) {
    let attachment;
    try {
      attachment = ws.deserializeAttachment();
    } catch {
      attachment = null;
    }
    if (!attachment || !ROLE_IDS.includes(attachment.roleId)) return;
    const state = this.loadState();
    if (!state || isExpired(state)) return;
    const result = disconnectSeat(state, {
      roleId: attachment.roleId,
      connectionId: attachment.connectionId,
      now: Date.now()
    });
    if (!result.ok || !result.changed) return;
    await this.persistAndBroadcast(result.state);
  }

  async alarm() {
    const state = this.loadState();
    if (!state) return;
    const now = Date.now();
    if (now < state.expiresAt && !state.expired) {
      await this.scheduleExpiry(state);
      return;
    }
    state.expired = true;
    state.lastActivityAt = now;
    this.saveState(state);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.close(4001, "expired");
      } catch {
        // Already closed.
      }
    }
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/init" && request.method === "POST") return this.handleInit(request, url);
    if (url.pathname === "/snapshot" && request.method === "GET") return this.handleSnapshot(request);
    if (url.pathname === "/ws" && request.method === "GET") return this.handleWebSocket(request, url);
    return textResponse(request, "Not found", 404);
  }
}

async function initRoom(env, roomCode, profile) {
  const id = env.ROOM.idFromName(`a8:${roomCode}`);
  const stub = env.ROOM.get(id);
  const response = await stub.fetch(`https://a8-room.internal/init?roomCode=${roomCode}&profile=${profile}`, { method: "POST" });
  return response.json();
}

function workerUrlForRoom(env, roomCode, path, request = null) {
  const id = env.ROOM.idFromName(`a8:${roomCode}`);
  const target = new URL(`https://a8-room.internal${path}`);
  const forwarded = request ? new Request(target, request) : new Request(target);
  return env.ROOM.get(id).fetch(forwarded);
}

export default {
  async fetch(request, env) {
    if (!originAllowed(request)) return textResponse(request, "Origin not allowed", 403);
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });

    if (url.pathname === "/health" && request.method === "GET") {
      return jsonResponse(request, { service: "momey-playable-a8-room", status: "ok" });
    }

    if (url.pathname === "/rooms" && request.method === "POST") {
      const rng = rngFromCrypto();
      const allocation = await findAvailableRoomCode(rng, async (roomCode) => {
        const profile = randomProfile(rng);
        return initRoom(env, roomCode, profile);
      });
      if (allocation) {
        return jsonResponse(request, {
          roomCode: allocation.roomCode,
          sharePath: `/playable-a8/?room=${allocation.roomCode}`
        }, 201);
      }
      return jsonResponse(request, { error: "ROOM_CODE_UNAVAILABLE" }, 503);
    }

    const match = url.pathname.match(/^\/rooms\/([^/]+)(\/ws)?$/);
    if (!match) return textResponse(request, "Not found", 404);
    const roomCode = normalizeCode(match[1]);
    if (!roomCode) return jsonResponse(request, { error: "INVALID_ROOM_CODE" }, 400);
    if (match[2] === "/ws") {
      const role = url.searchParams.get("role") || "";
      const token = url.searchParams.get("token");
      const query = new URLSearchParams({ role });
      if (token) query.set("token", token);
      return workerUrlForRoom(env, roomCode, `/ws?${query.toString()}`, request);
    }
    if (request.method === "GET") return workerUrlForRoom(env, roomCode, "/snapshot", request);
    return textResponse(request, "Method not allowed", 405);
  }
};
