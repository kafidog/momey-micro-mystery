export const ROLE_IDS = Object.freeze(["operations", "rescue", "safety"]);
export const A9_SCHEMA = "momey-a9-room-v1";
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const ROLE_LABELS = Object.freeze({ operations: "現場調度", rescue: "救援聯絡", safety: "結構安全" });
export const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
export const PHASES = Object.freeze(["LOBBY", "INTRO", "TRAINING", "WINDOW1", "INTERLUDE", "WINDOW2", "FINAL", "OUTCOME"]);
export const LIVE_PHASES = Object.freeze(["WINDOW1", "WINDOW2", "FINAL"]);
export const DURATIONS_MS = Object.freeze({ WINDOW1: 70_000, WINDOW2: 60_000, FINAL: 45_000 });

const PHASE_INDEX = new Map(PHASES.map((phase, index) => [phase, index]));
const POWER_MODES = new Set(["gate", "balanced", "rail"]);
const CONTROL_OWNER = Object.freeze({ SET_POWER: "operations", TROLLEY_START: "rescue", TROLLEY_STOP: "rescue", SECURE_TROLLEY: "rescue", BRACE_START: "safety", BRACE_STOP: "safety", DEPLOY_SHIELD: "safety", RETREAT_GAO: "safety", CLOSE_START: "operations", CLOSE_STOP: "operations" });

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function round1(value) { return Math.round(value * 10) / 10; }
function allSeats(state, predicate) { return ROLE_IDS.every((roleId) => predicate(state.seats[roleId], roleId)); }
function allStarted(state) { return allSeats(state, (seat) => Boolean(seat.token && seat.started)); }
function allTrained(state) { return allSeats(state, (seat) => seat.trained); }
function chooseAudioMaster(state) { return ROLE_IDS.find((roleId) => state.seats[roleId].connected && state.seats[roleId].started) || null; }
function touch(state, now) { state.updatedAt = now; state.expiresAt = now + ROOM_TTL_MS; }
function event(id, caption) { return { id, caption, acknowledged: false }; }

function makeSeat(roleId) {
  return { roleId, roleLabel: ROLE_LABELS[roleId], token: null, connected: false, connectionId: null, started: false, trained: false };
}

function makeMetrics(now) {
  return {
    lastAt: now,
    powerMode: "gate",
    backupPower: 100,
    trolleyPosition: 0,
    trolleyMoving: false,
    trolleyHeat: 0,
    trolleyStalls: 0,
    rescueCheckpoint: 0,
    linBoundary: false,
    trolleySecured: false,
    gatePressure: 34,
    gateDamage: 0,
    braceActive: false,
    braceStamina: 100,
    braceStable: false,
    shieldAvailable: true,
    shieldDeployed: false,
    gaoExposure: 8,
    gaoRetreated: false,
    closeActive: false,
    closeProgress: 0,
    closeAttempts: 0,
    finalQualifiedMs: 0,
    majorEventSerial: 0,
    latestMajorEvent: "三支手機已連上同一場事件。"
  };
}

export function createRoom({ roomCode, now = Date.now() }) {
  const seats = {};
  for (const roleId of ROLE_IDS) seats[roleId] = makeSeat(roleId);
  return {
    schema: A9_SCHEMA,
    roomCode,
    phase: "LOBBY",
    version: 0,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + ROOM_TTL_MS,
    phaseStartedAt: null,
    deadlineAt: null,
    seats,
    audioMasterRole: null,
    operatorEvent: null,
    metrics: makeMetrics(now),
    history: [],
    outcome: null
  };
}

function record(state, now, type, roleId, detail = {}) {
  state.history.push({ at: now, phase: state.phase, type, roleId, ...detail });
  if (state.history.length > 160) state.history.shift();
}

function markMajor(state, text) {
  if (state.metrics.latestMajorEvent === text) return;
  state.metrics.latestMajorEvent = text;
  state.metrics.majorEventSerial += 1;
}

function rates(state) {
  const m = state.metrics;
  const live = state.phase;
  const surge = live === "WINDOW2" ? 1.9 : live === "FINAL" ? 1.55 : 1;
  const gateSupport = m.powerMode === "gate" ? 7.2 : m.powerMode === "balanced" ? 2.6 : -5.8;
  const railSpeed = m.powerMode === "rail" ? 3.4 : m.powerMode === "balanced" ? 1.45 : 0;
  const railDraw = m.powerMode === "rail" ? 1.1 : m.powerMode === "balanced" ? 0.42 : 0.18;
  const braceSupport = m.braceActive && m.braceStamina > 0 ? 8.4 : 0;
  const shieldSupport = m.shieldDeployed ? 1.6 : 0;
  return { surge, gateSupport, railSpeed, railDraw, braceSupport, shieldSupport };
}

function materializeStep(state, dt, now) {
  const m = state.metrics;
  const r = rates(state);
  const seconds = dt / 1000;
  if (LIVE_PHASES.includes(state.phase)) {
    m.backupPower = clamp(m.backupPower - r.railDraw * seconds, 0, 100);
    const pressureRate = 5.3 * r.surge - r.gateSupport - r.braceSupport - r.shieldSupport;
    m.gatePressure = clamp(m.gatePressure + pressureRate * seconds, 0, 100);
    if (m.gatePressure >= 88) m.gateDamage = clamp(m.gateDamage + (m.gatePressure - 84) * 0.022 * seconds, 0, 100);
    if (m.braceActive && m.braceStamina > 0) m.braceStamina = clamp(m.braceStamina - 6.2 * seconds, 0, 100);
    else m.braceStamina = clamp(m.braceStamina + 4.4 * seconds, 0, 100);
    if (m.braceStamina === 0) m.braceActive = false;
    m.braceStable = Boolean(m.braceActive && m.braceStamina >= 14 && m.gatePressure <= 76);

    const canMove = m.trolleyMoving && r.railSpeed > 0 && m.backupPower > 0 && m.trolleyHeat < 100;
    if (canMove) {
      const routeLimit = state.phase === "WINDOW1" ? 62 : 100;
      m.trolleyPosition = clamp(m.trolleyPosition + r.railSpeed * seconds, 0, routeLimit);
      m.trolleyHeat = clamp(m.trolleyHeat + (m.powerMode === "rail" ? 4.6 : 2.1) * seconds, 0, 100);
    } else {
      m.trolleyHeat = clamp(m.trolleyHeat - 7.2 * seconds, 0, 100);
    }
    if (m.trolleyHeat >= 100 && m.trolleyMoving) {
      m.trolleyMoving = false;
      m.trolleyStalls += 1;
      markMajor(state, "救援車過熱停下；先放開推進，等溫度下降。 ");
    }
    const checkpoint = m.trolleyPosition >= 74 ? 3 : m.trolleyPosition >= 48 ? 2 : m.trolleyPosition >= 24 ? 1 : 0;
    if (checkpoint > m.rescueCheckpoint) {
      m.rescueCheckpoint = checkpoint;
      markMajor(state, checkpoint === 3 ? "救援車已到第三標記；林芮接近安全界線。" : `救援車已到第${checkpoint === 1 ? "一" : "二"}標記。`);
    }
    if (!m.linBoundary && m.trolleyPosition >= 82) {
      m.linBoundary = true;
      markMajor(state, "救援車穿過第三標記；救援席收到新的本地訊號。 ");
    }
    if (!m.gaoRetreated) {
      const protection = m.shieldDeployed ? 0.34 : 1;
      const exposureRate = Math.max(0, (m.gatePressure - 48) / 24) * r.surge * protection;
      m.gaoExposure = clamp(m.gaoExposure + exposureRate * seconds, 0, 100);
    }

    const finalConditions = state.phase === "FINAL" && m.linBoundary && m.trolleySecured && m.braceStable && !m.gaoRetreated && m.gatePressure <= 76;
    if (m.closeActive) {
      if (finalConditions) {
        m.closeProgress = clamp(m.closeProgress + 14 * seconds, 0, 100);
        m.finalQualifiedMs += dt;
      } else {
        m.closeProgress = clamp(m.closeProgress - 4.5 * seconds, 0, 100);
        m.gatePressure = clamp(m.gatePressure + 1.3 * seconds, 0, 100);
      }
    }
  }
  m.lastAt = now;
}

export function materialize(inputState, now = Date.now()) {
  const state = clone(inputState);
  let cursor = state.metrics.lastAt;
  const cappedNow = Math.max(cursor, now);
  const integrationEnd = LIVE_PHASES.includes(state.phase) && state.deadlineAt
    ? Math.min(cappedNow, state.deadlineAt)
    : cappedNow;
  while (cursor < integrationEnd) {
    const next = Math.min(integrationEnd, cursor + 1000);
    materializeStep(state, next - cursor, next);
    cursor = next;
  }
  if (state.phase === "FINAL" && state.metrics.closeProgress >= 100) {
    completeOutcome(state, integrationEnd, "GATE_CLOSED");
  }
  if (LIVE_PHASES.includes(state.phase) && state.deadlineAt && cappedNow >= state.deadlineAt) {
    finishTimedPhase(state, state.deadlineAt);
    state.metrics.lastAt = cappedNow;
  }
  return state;
}

function setPhase(state, phase, now, duration = null) {
  state.phase = phase;
  state.phaseStartedAt = now;
  state.deadlineAt = duration ? now + duration : null;
  state.metrics.lastAt = now;
  record(state, now, "PHASE", null, { next: phase });
}

function finishTimedPhase(state, now) {
  const from = state.phase;
  state.metrics.trolleyMoving = false;
  state.metrics.braceActive = false;
  state.metrics.closeActive = false;
  if (from === "WINDOW1") {
    setPhase(state, "INTERLUDE", now);
    state.operatorEvent = event("A9_WINDOW1_RESULT", `第一段操作結束。救援車停在 ${Math.round(state.metrics.trolleyPosition)}；剩餘電力 ${Math.round(state.metrics.backupPower)}。第二波即將到達。`);
  } else if (from === "WINDOW2") {
    setPhase(state, "FINAL", now, DURATIONS_MS.FINAL);
    state.operatorEvent = event("A9_FINAL_START", "最後協作窗口開始。救援聯絡確認界線，結構安全守住支撐，現場調度抓住關閘時機。 ");
  } else if (from === "FINAL") {
    completeOutcome(state, now, "TIME_EXPIRED");
  }
}

function completeOutcome(state, now, reason) {
  const m = state.metrics;
  m.trolleyMoving = m.braceActive = m.closeActive = false;
  const gateClosed = m.closeProgress >= 100;
  const linSafe = Boolean(m.linBoundary && m.trolleySecured);
  const gaoSafe = Boolean(m.gaoRetreated || (m.gaoExposure < 65 && m.gateDamage < 70));
  const variant = gateClosed && linSafe && gaoSafe ? "COORDINATED_CLOSE" :
    gateClosed && linSafe ? "CLOSE_GAO_HARM" :
    linSafe && gaoSafe ? "RESCUE_WITH_GATE_DAMAGE" :
    gaoSafe ? "LIN_STRANDED" : "BOTH_EXPOSED";
  state.outcome = {
    variant,
    reason,
    gateClosed,
    linSafe,
    gaoSafe,
    metrics: { trolleyPosition: round1(m.trolleyPosition), backupPower: round1(m.backupPower), gatePressure: round1(m.gatePressure), gateDamage: round1(m.gateDamage), gaoExposure: round1(m.gaoExposure), closeProgress: round1(m.closeProgress), trolleyStalls: m.trolleyStalls },
    causal: [
      `現場調度最後留下 ${Math.round(m.backupPower)}% 備用電力，關閘完成 ${Math.round(m.closeProgress)}%。`,
      `救援聯絡把救援車推到 ${Math.round(m.trolleyPosition)}，林芮${linSafe ? "已越界並固定" : "未完成越界固定"}。`,
      `結構安全讓高承暴露停在 ${Math.round(m.gaoExposure)}，閘門損傷 ${Math.round(m.gateDamage)}。`
    ]
  };
  setPhase(state, "OUTCOME", now);
  state.operatorEvent = event(`A9_OUTCOME_${variant}`, outcomeCaption(variant));
}

function outcomeCaption(variant) {
  return {
    COORDINATED_CLOSE: "中央隔離閘完成關閉。林芮已由救援車帶離，高承也離開污染暴露。",
    CLOSE_GAO_HARM: "中央隔離閘完成關閉，林芮已帶離；高承在最後支撐中受到不可逆傷害。",
    RESCUE_WITH_GATE_DAMAGE: "林芮已帶離，高承也撤出；中央隔離閘沒有完成關閉，站體持續受損。",
    LIN_STRANDED: "高承離開暴露區，但林芮沒有在窗口結束前完成越界固定。",
    BOTH_EXPOSED: "救援與支撐都沒有在窗口內完成；林芮與高承仍承受事件後果。"
  }[variant];
}

function ok(state) { state.version += 1; return { ok: true, state }; }
function fail(inputState, code, message) { return { ok: false, code, message, state: inputState }; }
function checkEnvelope(state, command) {
  const seat = state.seats[command.roleId];
  if (!seat || !seat.token || seat.token !== command.token) return "TOKEN_MISMATCH";
  const sentIndex = PHASE_INDEX.get(command.phase);
  const currentIndex = PHASE_INDEX.get(state.phase);
  if (sentIndex === undefined) return "MALFORMED_COMMAND";
  if (sentIndex < currentIndex) return "STALE_PHASE";
  if (sentIndex > currentIndex) return "FUTURE_PHASE";
  if (command.version < state.version) return "STALE_VERSION";
  if (command.version > state.version) return "FUTURE_VERSION";
  return null;
}

export function applyCommand(inputState, command, now = Date.now()) {
  let state = materialize(inputState, now);
  if (state.phase !== inputState.phase || state.version !== inputState.version) {
    state.version = inputState.version + 1;
    touch(state, now);
    return { ok: true, state, advancedByClock: true };
  }
  const envelope = checkEnvelope(state, command);
  if (envelope) return fail(inputState, envelope, "這支手機的畫面已不是目前狀態。 ");
  const roleId = command.roleId;
  const seat = state.seats[roleId];
  if (command.type === "TAKEOVER") {
    if (state.phase !== "LOBBY") return fail(inputState, "FUTURE_STAGE", "接手已結束。 ");
    if (seat.started) return fail(inputState, "DUPLICATE_ACTION", "這個角色已接手。 ");
    seat.started = true;
    if (!state.audioMasterRole) state.audioMasterRole = roleId;
    record(state, now, "TAKEOVER", roleId);
    if (allStarted(state)) {
      setPhase(state, "INTRO", now);
      state.operatorEvent = event("A9_INTRO", "林芮困在西側救援軌道，高承守著中央隔離閘。你們的三支手機分別控制電力、救援車與支撐。 ");
    }
    touch(state, now); return ok(state);
  }
  if (command.type === "COMPLETE_OPERATOR") {
    if (!state.operatorEvent || state.operatorEvent.id !== command.eventId) return fail(inputState, "WRONG_OPERATOR_EVENT", "這段播報已經換了。 ");
    if (state.audioMasterRole !== roleId) return fail(inputState, "NOT_AUDIO_MASTER", "由目前播報手機完成。 ");
    if (state.operatorEvent.acknowledged) return fail(inputState, "DUPLICATE_ACTION", "播報已完成。 ");
    state.operatorEvent.acknowledged = true;
    if (state.phase === "INTRO") setPhase(state, "TRAINING", now);
    else if (state.phase === "INTERLUDE") {
      setPhase(state, "WINDOW2", now, DURATIONS_MS.WINDOW2);
      state.operatorEvent = event("A9_WINDOW2_START", "第二波到達。第一段留下的救援位置、電力與閘門損傷全部保留。 ");
    }
    touch(state, now); return ok(state);
  }
  if (command.type === "TRAIN") {
    if (state.phase !== "TRAINING") return fail(inputState, "FUTURE_STAGE", "現在不是測試控制。 ");
    if (seat.trained) return fail(inputState, "DUPLICATE_ACTION", "控制已測試。 ");
    seat.trained = true; record(state, now, "TRAIN", roleId);
    if (allTrained(state)) {
      setPhase(state, "WINDOW1", now, DURATIONS_MS.WINDOW1);
      state.operatorEvent = event("A9_WINDOW1_START", "第一段操作開始。救援車需要電，中央隔離閘需要支撐；請直接互相喊出你們看到的狀況。 ");
    }
    touch(state, now); return ok(state);
  }
  const owner = CONTROL_OWNER[command.type];
  if (owner && owner !== roleId) return fail(inputState, "WRONG_ROLE", "這不是你這支手機的控制。 ");
  if (!LIVE_PHASES.includes(state.phase)) return fail(inputState, "FUTURE_STAGE", "目前不是操作窗口。 ");
  const m = state.metrics;
  switch (command.type) {
    case "SET_POWER":
      if (!POWER_MODES.has(command.mode)) return fail(inputState, "MALFORMED_ACTION", "請使用畫面上的電力位置。 ");
      m.powerMode = command.mode;
      markMajor(state, command.mode === "rail" ? "現場調度已把電切到救援軌道。" : command.mode === "gate" ? "現場調度已把電切回中央隔離閘。" : "現場調度把電力維持在平衡位置。 ");
      break;
    case "TROLLEY_START":
      if (m.trolleyMoving) return fail(inputState, "DUPLICATE_ACTION", "救援車正在前進。 ");
      if (rates(state).railSpeed <= 0 || m.backupPower <= 0 || m.trolleyHeat >= 94) return fail(inputState, "IMPOSSIBLE_CONTROL", "救援車目前沒有可用的推進條件。 ");
      m.trolleyMoving = true; break;
    case "TROLLEY_STOP":
      if (!m.trolleyMoving) return fail(inputState, "DUPLICATE_ACTION", "救援車已停下。 ");
      m.trolleyMoving = false; break;
    case "BRACE_START":
      if (m.braceActive) return fail(inputState, "DUPLICATE_ACTION", "支撐正在受力。 ");
      if (m.braceStamina < 8) return fail(inputState, "IMPOSSIBLE_CONTROL", "支撐力尚未恢復。 ");
      m.braceActive = true; markMajor(state, "結構安全已開始撐住中央隔離閘。 "); break;
    case "BRACE_STOP":
      if (!m.braceActive) return fail(inputState, "DUPLICATE_ACTION", "支撐已放開。 ");
      m.braceActive = false; markMajor(state, "結構安全已放開支撐，正在恢復力量。 "); break;
    case "DEPLOY_SHIELD":
      if (state.phase !== "WINDOW2") return fail(inputState, "FUTURE_STAGE", "防濺屏要留到第二波。 ");
      if (!m.shieldAvailable) return fail(inputState, "DUPLICATE_ACTION", "防濺屏已使用。 ");
      m.shieldAvailable = false; m.shieldDeployed = true; markMajor(state, "結構安全已升起防濺屏；高承暴露下降。 "); break;
    case "SECURE_TROLLEY":
      if (state.phase !== "FINAL" || !m.linBoundary) return fail(inputState, "IMPOSSIBLE_CONTROL", "林芮還沒越過安全界線。 ");
      m.trolleyMoving = false; m.trolleySecured = true; markMajor(state, "救援聯絡已固定救援車；精確位置由救援席確認。 "); break;
    case "RETREAT_GAO":
      if (state.phase !== "FINAL") return fail(inputState, "FUTURE_STAGE", "現在還不是撤離窗口。 ");
      m.gaoRetreated = true; m.braceActive = false; markMajor(state, "結構安全已命令高承後撤；現場支撐已放開。 "); break;
    case "CLOSE_START":
      if (state.phase !== "FINAL") return fail(inputState, "FUTURE_STAGE", "關閘控制還不能使用。 ");
      if (m.closeActive) return fail(inputState, "DUPLICATE_ACTION", "關閘拉桿正在受力。 ");
      m.closeActive = true; m.closeAttempts += 1; markMajor(state, "現場調度開始拉下中央隔離閘。 "); break;
    case "CLOSE_STOP":
      if (!m.closeActive) return fail(inputState, "DUPLICATE_ACTION", "關閘拉桿已放開。 ");
      m.closeActive = false; break;
    case "HEARTBEAT":
      break;
    default:
      return fail(inputState, "MALFORMED_COMMAND", "這個控制不存在。 ");
  }
  record(state, now, command.type, roleId, command.mode ? { mode: command.mode } : {});
  if (state.phase === "FINAL" && m.closeProgress >= 100) completeOutcome(state, now, "GATE_CLOSED");
  touch(state, now); return ok(state);
}

export function connectSeat(inputState, { roleId, token = null, newToken, connectionId, now = Date.now() }) {
  if (!ROLE_IDS.includes(roleId)) return fail(inputState, "MALFORMED_ROLE", "未知角色。 ");
  let state = materialize(inputState, now);
  const seat = state.seats[roleId];
  if (seat.token && token !== seat.token) return fail(inputState, seat.connected ? "SEAT_ALREADY_CONNECTED" : "TOKEN_MISMATCH", "這個角色已經有人使用。 ");
  seat.token = seat.token || newToken;
  seat.connected = true;
  seat.connectionId = connectionId;
  if (!state.audioMasterRole) state.audioMasterRole = chooseAudioMaster(state) || roleId;
  touch(state, now); state.version += 1;
  return { ok: true, state, token: seat.token };
}

export function disconnectSeat(inputState, { roleId, connectionId, now = Date.now() }) {
  let state = materialize(inputState, now);
  const seat = state.seats[roleId];
  if (!seat || seat.connectionId !== connectionId) return { ok: true, state };
  seat.connected = false; seat.connectionId = null;
  if (roleId === "rescue") state.metrics.trolleyMoving = false;
  if (roleId === "safety") state.metrics.braceActive = false;
  if (roleId === "operations") state.metrics.closeActive = false;
  if (state.audioMasterRole === roleId) state.audioMasterRole = chooseAudioMaster(state);
  markMajor(state, `${ROLE_LABELS[roleId]}暫時斷線；該席持續操作已安全放開。`);
  touch(state, now); state.version += 1;
  return { ok: true, state };
}

function timeLeftMs(state, now) { return state.deadlineAt ? Math.max(0, state.deadlineAt - now) : null; }
function coarsePressure(value) { return value >= 82 ? "危急" : value >= 62 ? "升高" : value >= 36 ? "受力" : "穩定"; }
function coarseTrolley(value) { return value >= 74 ? "第三標記" : value >= 48 ? "第二標記" : value >= 24 ? "第一標記" : "起點"; }

export function projectRoomState(inputState, roleId = null, now = Date.now()) {
  const state = materialize(inputState, now);
  const seat = roleId && state.seats[roleId] ? state.seats[roleId] : null;
  const m = state.metrics;
  const base = {
    roomCode: state.roomCode,
    phase: state.phase,
    version: state.version,
    serverNow: now,
    deadlineAt: state.deadlineAt,
    timeLeftMs: timeLeftMs(state, now),
    audioMasterRole: state.audioMasterRole,
    audioMasterLabel: state.audioMasterRole ? ROLE_LABELS[state.audioMasterRole] : null,
    operatorEvent: clone(state.operatorEvent),
    currentSeat: seat ? { roleId, roleLabel: ROLE_LABELS[roleId], connected: seat.connected, started: seat.started, trained: seat.trained } : null,
    seats: ROLE_IDS.map((id) => ({ roleId: id, roleLabel: ROLE_LABELS[id], occupied: Boolean(state.seats[id].token), connected: state.seats[id].connected, started: state.seats[id].started, trained: state.seats[id].trained })),
    shared: { timerLabel: state.deadlineAt ? `${Math.ceil(timeLeftMs(state, now) / 1000)} 秒` : null, trolley: coarseTrolley(m.trolleyPosition), pressure: coarsePressure(m.gatePressure), power: m.backupPower <= 0 ? "用完" : m.backupPower < 30 ? "很少" : "還有", latestMajorEvent: m.latestMajorEvent, majorEventSerial: m.majorEventSerial },
    control: null,
    outcome: state.outcome ? clone(state.outcome) : null
  };
  if (!seat) return base;
  if (roleId === "operations") base.control = {
    type: "power-gate",
    powerMode: m.powerMode,
    backupPowerExact: round1(m.backupPower),
    leverResistance: m.gatePressure <= 76 && m.powerMode !== "rail" ? "負載可控" : "負載過高",
    closeActive: m.closeActive,
    closeProgressExact: round1(m.closeProgress),
    safetySupportCoarse: m.braceActive ? "有人撐住" : "支撐已放開"
  };
  if (roleId === "rescue") base.control = {
    type: "trolley",
    railPowered: rates(state).railSpeed > 0 && m.backupPower > 0,
    trolleyMoving: m.trolleyMoving,
    positionExact: round1(m.trolleyPosition),
    heatExact: round1(m.trolleyHeat),
    checkpointExact: m.rescueCheckpoint,
    linBoundaryExact: m.linBoundary,
    secured: m.trolleySecured,
    gateLoadCoarse: coarsePressure(m.gatePressure)
  };
  if (roleId === "safety") base.control = {
    type: "brace",
    pressureExact: round1(m.gatePressure),
    pressureTrend: rates(state).gateSupport < 0 ? "快速上升" : rates(state).gateSupport > 5 ? "下降" : "緩慢變動",
    braceActive: m.braceActive,
    braceStaminaExact: round1(m.braceStamina),
    braceStableExact: m.braceStable,
    gaoExposureExact: round1(m.gaoExposure),
    shieldAvailable: m.shieldAvailable,
    shieldDeployed: m.shieldDeployed,
    gaoRetreated: m.gaoRetreated,
    railPowerCoarse: m.powerMode === "rail" ? "救援軌道吃滿電力" : "救援軌道未吃滿電力"
  };
  return base;
}

export function safeAlarmAt(state) {
  const candidates = [state.expiresAt];
  if (LIVE_PHASES.includes(state.phase) && state.deadlineAt) candidates.push(state.deadlineAt);
  return Math.min(...candidates.filter(Number.isFinite));
}

export function isExpired(state, now = Date.now()) {
  return Boolean(!state || now >= state.expiresAt);
}

export function publicLobbyState(state, now = Date.now()) {
  const projection = projectRoomState(state, null, now);
  return {
    roomCode: projection.roomCode,
    phase: projection.phase,
    version: projection.version,
    seats: projection.seats,
    audioMasterRole: projection.audioMasterRole,
    audioMasterLabel: projection.audioMasterLabel,
    expiresAt: state.expiresAt
  };
}
