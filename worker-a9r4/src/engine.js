export const ROLE_IDS = Object.freeze(["operations", "rescue", "safety"]);
export const A9R4_SCHEMA = "momey-a9r4-room-v1";
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const ROLE_LABELS = Object.freeze({ operations: "現場調度", rescue: "救援聯絡", safety: "結構安全" });
export const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
export const PHASES = Object.freeze(["LOBBY", "BRIEFING", "TRAINING", "WINDOW1", "INTERLUDE", "WINDOW2", "FINAL", "OUTCOME"]);
export const LIVE_PHASES = Object.freeze(["WINDOW1", "WINDOW2", "FINAL"]);
export const DURATIONS_MS = Object.freeze({ WINDOW1: 70_000, WINDOW2: 60_000, FINAL: 45_000 });
export const OBJECTIVE_THRESHOLDS = Object.freeze({
  WINDOW1_TROLLEY: 48,
  WINDOW1_PRESSURE_MAX: 82,
  WINDOW2_TROLLEY: 82,
  WINDOW2_PRESSURE_MAX: 76
});
export const BRIEFING_BEATS = Object.freeze([
  Object.freeze({ number: 1, id: "A9R_BRIEFING_1", title: "海岬防洪站", caption: "海岬防洪站擋住暴潮與污染水，避免它們穿過站體進入沿岸設施。" }),
  Object.freeze({ number: 2, id: "A9R_BRIEFING_2", title: "林芮｜西側維修員", caption: "林芮檢查西側救援軌道時，壓力衝擊卡死回程。她困在污染區一側，只能靠救援車越過安全界線。" }),
  Object.freeze({ number: 3, id: "A9R_BRIEFING_3", title: "高承｜閘門維護員", caption: "高承趕到中央隔離閘處理故障。自動支撐失效，他留在閘旁手動承受負載，也持續接觸污染。" }),
  Object.freeze({ number: 4, id: "A9R_BRIEFING_4", title: "壓力衝擊", caption: "污染水正在西側事件區加壓；救援軌道與中央閘門必須共用有限的備用電力。" }),
  Object.freeze({ number: 5, id: "A9R_BRIEFING_5", title: "中央隔離閘", caption: "關閘會封住污染區，也會切斷西側救援路線。太早關，林芮回不來；拖太久，高承與站體會承受傷害。" }),
  Object.freeze({ number: 6, id: "A9R_BRIEFING_6", title: "同一場救援", caption: "你們分別控制電力與關閘、林芮的救援車、以及高承的支撐。移動林芮、保護高承，再一起抓住安全關閘時機。" })
]);
export const TRAINING_STEPS = Object.freeze([
  Object.freeze({ number: 1, roleId: "operations", effect: "railPower", eventId: "A9R_TRAINING_RAIL_POWER", targetRole: "rescue", caption: "測試電力已送到救援軌道。" }),
  Object.freeze({ number: 2, roleId: "rescue", effect: "gateLoad", eventId: "A9R_TRAINING_GATE_LOAD", targetRole: "safety", caption: "救援車測試前進；測試負載已到中央隔離閘。" }),
  Object.freeze({ number: 3, roleId: "safety", effect: "support", eventId: "A9R_TRAINING_SUPPORT", targetRole: "operations", caption: "測試支撐已接上；現場調度看見支撐回到控制台。" })
]);
export const PRESSURE_WAVE_VARIANTS = Object.freeze([
  Object.freeze({ id: "EARLY_RELIEF", reliefStartMs: 4_000, reliefEndMs: 24_000 }),
  Object.freeze({ id: "MID_RELIEF", reliefStartMs: 14_000, reliefEndMs: 34_000 }),
  Object.freeze({ id: "LATE_RELIEF", reliefStartMs: 23_000, reliefEndMs: 44_000 })
]);

const PHASE_INDEX = new Map(PHASES.map((phase, index) => [phase, index]));
const POWER_MODES = new Set(["gate", "balanced", "rail"]);
const CONTROL_OWNER = Object.freeze({ SET_POWER: "operations", TROLLEY_START: "rescue", TROLLEY_STOP: "rescue", SECURE_TROLLEY: "rescue", BRACE_START: "safety", BRACE_STOP: "safety", DEPLOY_SHIELD: "safety", RETREAT_GAO: "safety", CLOSE_START: "operations", CLOSE_STOP: "operations" });

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function round1(value) { return Math.round(value * 10) / 10; }
function allSeats(state, predicate) { return ROLE_IDS.every((roleId) => predicate(state.seats[roleId], roleId)); }
function allStarted(state) { return allSeats(state, (seat) => Boolean(seat.token && seat.started)); }
function chooseAudioMaster(state) { return ROLE_IDS.find((roleId) => state.seats[roleId].connected && state.seats[roleId].started) || null; }
function touch(state, now) { state.updatedAt = now; state.expiresAt = now + ROOM_TTL_MS; }
function event(id, caption) { return { id, caption, acknowledged: false }; }
function choosePressureWave(roomCode) {
  const hash = [...String(roomCode || "")].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3), 0);
  return clone(PRESSURE_WAVE_VARIANTS[hash % PRESSURE_WAVE_VARIANTS.length]);
}
function makeTrainingEffects() { return { railPower: false, gateLoad: false, support: false, last: null }; }
function briefingEvent(beatNumber) {
  const beat = BRIEFING_BEATS[beatNumber - 1];
  return event(beat.id, beat.caption);
}

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
    window1RouteLocked: false,
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
    prematureCloseCount: 0,
    closeStallMs: 0,
    closeLockoutUntil: 0,
    finalQualifiedMs: 0,
    finalRelief: false,
    systemEventSerial: 0,
    systemEvent: "三支手機已連上同一場事件。",
    operationsEventSerial: 0,
    operationsEvent: "備用電力目前供應中央隔離閘。",
    rescueEventSerial: 0,
    rescueEvent: "救援車停在西側起點。",
    safetyEventSerial: 0,
    safetyEvent: "中央隔離閘目前可控。"
  };
}

export function createRoom({ roomCode, now = Date.now() }) {
  const seats = {};
  for (const roleId of ROLE_IDS) seats[roleId] = makeSeat(roleId);
  return {
    schema: A9R4_SCHEMA,
    roomCode,
    phase: "LOBBY",
    version: 0,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + ROOM_TTL_MS,
    phaseStartedAt: null,
    deadlineAt: null,
    briefingBeat: 0,
    trainingStep: 0,
    trainingEffects: makeTrainingEffects(),
    trainingHistory: [],
    trainingSummary: null,
    seats,
    audioMasterRole: null,
    operatorEvent: null,
    pressureWave: choosePressureWave(roomCode),
    metrics: makeMetrics(now),
    milestones: [],
    milestoneKeys: [],
    history: [],
    outcome: null
  };
}

function record(state, now, type, roleId, detail = {}) {
  state.history.push({ at: now, phase: state.phase, type, roleId, ...detail });
  if (state.history.length > 160) state.history.shift();
}

function markEvent(state, audience, text) {
  const eventKey = `${audience}Event`;
  const serialKey = `${audience}EventSerial`;
  if (state.metrics[eventKey] === text) return;
  state.metrics[eventKey] = text;
  state.metrics[serialKey] += 1;
}

function markMilestone(state, now, key, text, audience) {
  if (state.milestoneKeys.includes(key)) return;
  state.milestoneKeys.push(key);
  state.milestones.push({ at: now, phase: state.phase, key, text, audience });
  if (state.milestones.length > 24) state.milestones.shift();
  markEvent(state, audience, text);
  record(state, now, "MILESTONE", null, { key, text, audience });
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
    const pressureBefore = m.gatePressure;
    const braceStableBefore = m.braceStable;
    const reliefBefore = m.finalRelief;
    if (state.phase === "FINAL") {
      const finalElapsed = Math.max(0, now - state.phaseStartedAt);
      m.finalRelief = finalElapsed >= state.pressureWave.reliefStartMs && finalElapsed < state.pressureWave.reliefEndMs;
      if (!reliefBefore && m.finalRelief) markEvent(state, "safety", "高承：壓力波過了，支撐窗口打開；現在告訴調度席。 ");
      if (reliefBefore && !m.finalRelief) markEvent(state, "safety", "高承：下一股壓力到了，安全支撐窗口已關。 ");
    } else {
      m.finalRelief = false;
    }
    m.backupPower = clamp(m.backupPower - r.railDraw * seconds, 0, 100);
    const finalPulse = state.phase === "FINAL" && !m.finalRelief ? 3.2 : 0;
    const pressureRate = 5.3 * r.surge + finalPulse - r.gateSupport - r.braceSupport - r.shieldSupport;
    m.gatePressure = clamp(m.gatePressure + pressureRate * seconds, 0, 100);
    if (m.gatePressure >= 88) m.gateDamage = clamp(m.gateDamage + (m.gatePressure - 84) * 0.022 * seconds, 0, 100);
    const braceDrain = state.phase === "FINAL" && m.finalRelief ? 2 : 6.2;
    if (m.braceActive && m.braceStamina > 0) m.braceStamina = clamp(m.braceStamina - braceDrain * seconds, 0, 100);
    else m.braceStamina = clamp(m.braceStamina + 4.4 * seconds, 0, 100);
    if (m.braceStamina === 0) m.braceActive = false;
    m.braceStable = Boolean(m.braceActive && m.braceStamina >= 14 && m.gatePressure <= 76 && (state.phase !== "FINAL" || m.finalRelief));

    const canMove = m.trolleyMoving && r.railSpeed > 0 && m.backupPower > 0 && m.trolleyHeat < 100;
    if (canMove) {
      const routeLimit = state.phase === "WINDOW1" ? OBJECTIVE_THRESHOLDS.WINDOW1_TROLLEY : 100;
      m.trolleyPosition = clamp(m.trolleyPosition + r.railSpeed * seconds, 0, routeLimit);
      m.trolleyHeat = clamp(m.trolleyHeat + (m.powerMode === "rail" ? 4.6 : 2.1) * seconds, 0, 100);
    } else {
      m.trolleyHeat = clamp(m.trolleyHeat - 7.2 * seconds, 0, 100);
    }
    if (m.trolleyHeat >= 100 && m.trolleyMoving) {
      m.trolleyMoving = false;
      m.trolleyStalls += 1;
      markEvent(state, "rescue", "救援車過熱停下；先放開推進，等溫度下降。 ");
    }
    const checkpoint = m.trolleyPosition >= 74 ? 3 : m.trolleyPosition >= 48 ? 2 : m.trolleyPosition >= 24 ? 1 : 0;
    if (checkpoint > m.rescueCheckpoint) {
      m.rescueCheckpoint = checkpoint;
      markMilestone(state, now, `CHECKPOINT_${checkpoint}`, checkpoint === 3 ? "救援車已到第三標記；林芮接近安全界線。" : `救援車已到第${checkpoint === 1 ? "一" : "二"}標記。`, "rescue");
    }
    if (state.phase === "WINDOW1" && m.trolleyPosition >= OBJECTIVE_THRESHOLDS.WINDOW1_TROLLEY) {
      m.trolleyMoving = false;
      m.window1RouteLocked = true;
      markMilestone(state, now, "WINDOW1_ROUTE_LOCK", "救援車已到第二標記；前方安全鎖等待第二波解除。", "rescue");
    }
    if (!m.linBoundary && m.trolleyPosition >= 82) {
      m.linBoundary = true;
      markMilestone(state, now, "LIN_BOUNDARY", "林芮已越過安全界線；準備固定救援車。", "rescue");
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
        m.closeStallMs = 0;
        markEvent(state, "operations", "隔離閘開始下降；維持拉桿。 ");
      } else {
        m.closeProgress = clamp(m.closeProgress - 4.5 * seconds, 0, 100);
        m.gatePressure = clamp(m.gatePressure + 2.4 * seconds, 0, 100);
        m.closeStallMs += dt;
        markEvent(state, "operations", "隔離閘回彈；繼續硬拉會增加負載。 ");
        if (m.closeStallMs >= 1_500) {
          m.closeActive = false;
          m.closeStallMs = 0;
          m.closeLockoutUntil = now + 4_000;
          m.gateDamage = clamp(m.gateDamage + 24, 0, 100);
          m.prematureCloseCount = clamp(m.prematureCloseCount + 1, 0, 3);
          record(state, now, "PREMATURE_CLOSE_REBOUND", "operations", {
            attempt: m.closeAttempts,
            reboundCount: m.prematureCloseCount,
            gateDamage: round1(m.gateDamage)
          });
          markEvent(state, "operations", "拉桿已回彈並進入四秒機械冷卻；先聽兩席回報。 ");
        }
      }
    }
    if (pressureBefore < 62 && m.gatePressure >= 62) markMilestone(state, now, "PRESSURE_WARNING", "中央隔離閘壓力進入警戒。", "safety");
    if (pressureBefore < 82 && m.gatePressure >= 82) markMilestone(state, now, "PRESSURE_CRITICAL", "中央隔離閘壓力進入危急。", "safety");
    if (!braceStableBefore && m.braceStable) markMilestone(state, now, "BRACE_SAFE", "結構支撐進入安全帶；把時機告訴調度席。", "safety");
  }
  m.lastAt = now;
}

function phaseObjectiveSatisfied(state) {
  const m = state.metrics;
  if (state.phase === "WINDOW1") {
    return m.trolleyPosition >= OBJECTIVE_THRESHOLDS.WINDOW1_TROLLEY && m.gatePressure < OBJECTIVE_THRESHOLDS.WINDOW1_PRESSURE_MAX;
  }
  if (state.phase === "WINDOW2") {
    return m.linBoundary && m.gatePressure <= OBJECTIVE_THRESHOLDS.WINDOW2_PRESSURE_MAX;
  }
  return false;
}

export function materialize(inputState, now = Date.now()) {
  const state = clone(inputState);
  let cursor = state.metrics.lastAt;
  const cappedNow = Math.max(cursor, now);
  if (!LIVE_PHASES.includes(state.phase)) return state;
  const sourcePhase = state.phase;
  const sourceDeadline = state.deadlineAt;
  const integrationEnd = sourceDeadline
    ? Math.min(cappedNow, state.deadlineAt)
    : cappedNow;
  while (cursor < integrationEnd) {
    const next = Math.min(integrationEnd, cursor + 1000);
    materializeStep(state, next - cursor, next);
    cursor = next;
    if (phaseObjectiveSatisfied(state)) {
      finishLivePhase(state, next, "OBJECTIVE_COMPLETE");
      break;
    }
    if (state.phase === "FINAL" && state.metrics.closeProgress >= 100) {
      completeOutcome(state, next, "GATE_CLOSED");
      break;
    }
  }
  if (state.phase === sourcePhase && LIVE_PHASES.includes(state.phase) && sourceDeadline && cappedNow >= sourceDeadline) {
    finishLivePhase(state, sourceDeadline, "DEADLINE");
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

function finishLivePhase(state, now, reason) {
  const from = state.phase;
  state.metrics.trolleyMoving = false;
  state.metrics.braceActive = false;
  state.metrics.closeActive = false;
  if (from === "WINDOW1") {
    record(state, now, "WINDOW_OBJECTIVE", null, { window: 1, reason, trolleyPosition: round1(state.metrics.trolleyPosition), gatePressure: round1(state.metrics.gatePressure) });
    setPhase(state, "INTERLUDE", now);
    state.operatorEvent = event("A9_WINDOW1_RESULT", `${reason === "OBJECTIVE_COMPLETE" ? "第一段目標完成" : "第一段操作時間到"}。救援車停在 ${Math.round(state.metrics.trolleyPosition)}；剩餘電力 ${Math.round(state.metrics.backupPower)}。第二波即將到達。`);
  } else if (from === "WINDOW2") {
    record(state, now, "WINDOW_OBJECTIVE", null, { window: 2, reason, linBoundary: state.metrics.linBoundary, gatePressure: round1(state.metrics.gatePressure) });
    setPhase(state, "FINAL", now, DURATIONS_MS.FINAL);
    state.operatorEvent = event("A9_FINAL_START", "最後協作窗口開始。救援聯絡確認界線，結構安全守住支撐，現場調度抓住關閘時機。 ");
    markEvent(state, "system", "最後窗口開始；精確就位狀態由各席確認。 ");
    markEvent(state, "safety", "高承：最後壓力波還在推；我會回報支撐窗口。 ");
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
    recap: buildOutcomeRecap(m, gateClosed, linSafe, gaoSafe),
    causal: [
      `現場調度最後留下 ${Math.round(m.backupPower)}% 備用電力，關閘完成 ${Math.round(m.closeProgress)}%。`,
      `救援聯絡把救援車推到 ${Math.round(m.trolleyPosition)}，林芮${linSafe ? "已越界並固定" : "未完成越界固定"}。`,
      `結構安全讓高承暴露停在 ${Math.round(m.gaoExposure)}，閘門損傷 ${Math.round(m.gateDamage)}。`
    ]
  };
  const details = deriveOutcomeDetails(state, { gateClosed, linSafe, gaoSafe });
  state.outcome.details = details;
  state.outcome.recovery = details.recovery;
  state.outcome.causalRecap = details.causalRecap;
  state.outcome.contributions = details.contributions;
  setPhase(state, "OUTCOME", now);
  state.operatorEvent = event(`A9_OUTCOME_${variant}`, outcomeCaption(variant));
}

function buildOutcomeRecap(m, gateClosed, linSafe, gaoSafe) {
  const reboundCount = Number.isFinite(m.prematureCloseCount) ? m.prematureCloseCount : Math.min(3, Math.floor(Math.max(0, m.gateDamage) / 24));
  const gateCondition = outcomeGateCondition(m.gateDamage).label;
  const recap = [
    `你們把救援車送到第二標記，第一段路線在安全鎖前停住。`,
    m.linBoundary ? "第二波中，林芮越過了安全界線。" : `第二波結束時，林芮停在位置 ${Math.round(m.trolleyPosition)}，還沒越過安全界線。`,
    m.braceStable ? "結構安全把支撐帶進安全帶，替關閘留下窗口。" : m.gaoRetreated ? "高承已後撤，但現場支撐也隨之放開。" : "最後關閘窗口出現時，支撐仍未穩定。"
  ];
  if (gateClosed && linSafe && gaoSafe) {
    recap.push(reboundCount === 0
      ? "林芮完成固定後，中央隔離閘完成關閉，閘體保持完整。"
      : `關閘回彈${reboundCountLabel(reboundCount)}後，你們重新對齊回報並完成關閉；閘體${gateCondition}。`);
  } else if (gateClosed) {
    recap.push(linSafe ? `中央隔離閘完成關閉，但高承承受了最後負載；閘體${gateCondition}。` : `中央隔離閘完成關閉時，林芮尚未完成越界固定；閘體${gateCondition}。`);
  } else {
    recap.push(`中央隔離閘沒有在最後窗口內完成關閉；目前${gateCondition}。`);
  }
  return recap;
}

function outcomeGateCondition(gateDamage) {
  if (gateDamage < 12) return { key: "intact", label: "完整", tone: "ok" };
  if (gateDamage < 40) return { key: "damaged", label: "受損", tone: "warn" };
  return { key: "severely_damaged", label: "嚴重受損", tone: "danger" };
}

function reboundCountLabel(count) {
  if (count === 1) return "一次";
  if (count === 2) return "兩次";
  if (count === 3) return "三次";
  return `${count} 次`;
}

function hasMilestone(state, key) {
  return state.history.some((row) => row.type === "MILESTONE" && row.key === key);
}

export function deriveOutcomeDetails(state, { gateClosed, linSafe, gaoSafe } = {}) {
  const m = state.metrics;
  const resolvedGateClosed = gateClosed === undefined ? m.closeProgress >= 100 : Boolean(gateClosed);
  const resolvedLinSafe = linSafe === undefined ? Boolean(m.linBoundary && m.trolleySecured) : Boolean(linSafe);
  const resolvedGaoSafe = gaoSafe === undefined ? Boolean(m.gaoRetreated || (m.gaoExposure < 65 && m.gateDamage < 70)) : Boolean(gaoSafe);
  const gate = outcomeGateCondition(m.gateDamage);
  const reboundCount = Number.isFinite(m.prematureCloseCount)
    ? clamp(Math.round(m.prematureCloseCount), 0, 3)
    : clamp(Math.floor(Math.max(0, m.gateDamage) / 24), 0, 3);
  const braceHeldForWindow = Boolean(m.braceStable || hasMilestone(state, "BRACE_SAFE"));
  const recoveredAfterRebound = reboundCount === 0 || Boolean(resolvedGateClosed && resolvedLinSafe && resolvedGaoSafe);
  const reboundLabel = reboundCount === 0 ? "沒有提前拉閘回彈" : `提前拉閘回彈${reboundCountLabel(reboundCount)}`;
  const recoverySummary = reboundCount === 0
    ? "三席在可用窗口對齊後完成收束。"
    : recoveredAfterRebound
      ? `${reboundLabel}；聽取回報、等待機械恢復後重新完成收束。`
      : `${reboundLabel}；機械恢復後仍沒有完成全部收束。`;
  const linRui = {
    status: resolvedLinSafe ? "已越界並固定" : m.linBoundary ? "已越界，尚未固定" : "仍在污染區側",
    tone: resolvedLinSafe ? "ok" : "warn"
  };
  const gaoCheng = {
    status: m.gaoRetreated ? "已撤出污染暴露" : resolvedGaoSafe ? "仍在閘旁，暴露已受控" : "仍承受污染暴露",
    tone: resolvedGaoSafe ? "ok" : "danger"
  };
  const gateDetail = {
    status: resolvedGateClosed ? "已關閉" : "尚未關閉",
    state: resolvedGateClosed ? "closed" : "open",
    condition: gate.key,
    conditionLabel: gate.label,
    tone: resolvedGateClosed ? gate.tone : "danger"
  };
  const contributions = [
    {
      roleId: "operations",
      roleLabel: ROLE_LABELS.operations,
      sourceLabel: "電力控制台",
      line: resolvedGateClosed
        ? reboundCount === 0
          ? "收到兩席回報後，在可用窗口一次完成關閘。"
          : reboundCount === 1
            ? "第一次拉閘回彈；等待機械恢復與兩席回報後完成關閘。"
            : `${reboundCountLabel(reboundCount)}拉閘回彈；重新對齊兩席回報後完成關閘。`
        : m.closeAttempts > 0 ? "曾拉動關閘，但沒有完成關閉。" : "沒有在最後窗口完成關閘。"
    },
    {
      roleId: "rescue",
      roleLabel: ROLE_LABELS.rescue,
      sourceLabel: "西側救援回報",
      line: resolvedLinSafe ? "把林芮送過安全界線並固定救援車。" : m.linBoundary ? "把林芮送過安全界線，但沒有完成固定。" : "沒有在窗口內把林芮送過安全界線。"
    },
    {
      roleId: "safety",
      roleLabel: ROLE_LABELS.safety,
      sourceLabel: "閘門現場",
      line: m.gaoRetreated ? "讓高承撤出污染暴露；支撐也隨之放開。" : braceHeldForWindow ? "把支撐帶進可用窗口，讓高承留在可控位置。" : resolvedGaoSafe ? "讓高承留在可控暴露內。" : "沒有讓高承脫離污染暴露。"
    }
  ];
  const causalRecap = buildOutcomeRecap(m, resolvedGateClosed, resolvedLinSafe, resolvedGaoSafe);
  return {
    linRui,
    gaoCheng,
    gate: gateDetail,
    recovery: { reboundCount, recovered: recoveredAfterRebound, label: reboundLabel, summary: recoverySummary },
    causalRecap,
    contributions
  };
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
      setPhase(state, "BRIEFING", now);
      state.briefingBeat = 1;
      state.operatorEvent = briefingEvent(state.briefingBeat);
    }
    touch(state, now); return ok(state);
  }
  if (command.type === "COMPLETE_OPERATOR") {
    if (!state.operatorEvent || state.operatorEvent.id !== command.eventId) return fail(inputState, "WRONG_OPERATOR_EVENT", "這段播報已經換了。 ");
    if (state.audioMasterRole !== roleId) return fail(inputState, "NOT_AUDIO_MASTER", "由目前播報手機完成。 ");
    if (state.operatorEvent.acknowledged) return fail(inputState, "DUPLICATE_ACTION", "播報已完成。 ");
    state.operatorEvent.acknowledged = true;
    if (state.phase === "BRIEFING") {
      if (state.briefingBeat < BRIEFING_BEATS.length) {
        state.briefingBeat += 1;
        state.operatorEvent = briefingEvent(state.briefingBeat);
      } else {
        setPhase(state, "TRAINING", now);
        state.trainingStep = 0;
        state.trainingEffects = makeTrainingEffects();
        state.trainingHistory = [];
        state.trainingSummary = null;
        state.operatorEvent = null;
      }
    }
    else if (state.phase === "TRAINING" && state.trainingStep === TRAINING_STEPS.length && state.operatorEvent.id === "A9R_TRAINING_COMPLETE") {
      state.trainingEffects = makeTrainingEffects();
      setPhase(state, "WINDOW1", now, DURATIONS_MS.WINDOW1);
      state.metrics = makeMetrics(now);
      state.operatorEvent = event("A9_WINDOW1_START", "第一段目標：把林芮送到第二標記，同時別讓閘門進入危急。 ");
      markEvent(state, "system", "第一段操作開始；各席回報自己的精確狀態。 ");
    }
    else if (state.phase === "INTERLUDE") {
      setPhase(state, "WINDOW2", now, DURATIONS_MS.WINDOW2);
      state.metrics.window1RouteLocked = false;
      state.operatorEvent = event("A9_WINDOW2_START", "第二段目標：讓林芮越過安全界線，同時保住最後關閘條件。 ");
      markEvent(state, "system", "第二段操作開始；前方安全鎖已解除。 ");
    }
    touch(state, now); return ok(state);
  }
  if (command.type === "TRAIN") {
    if (state.phase !== "TRAINING") return fail(inputState, "FUTURE_STAGE", "現在不是測試控制。 ");
    const training = TRAINING_STEPS[state.trainingStep];
    if (!training) return fail(inputState, "DUPLICATE_ACTION", "三個安全測試都已完成。 ");
    if (training.roleId !== roleId) return fail(inputState, "WRONG_ROLE", `現在輪到${ROLE_LABELS[training.roleId]}做測試。 `);
    if (seat.trained) return fail(inputState, "DUPLICATE_ACTION", "這支手機的測試已完成。 ");
    const effect = { id: training.eventId, sourceRole: roleId, targetRole: training.targetRole, caption: training.caption };
    state.trainingStep += 1;
    state.trainingEffects = { ...state.trainingEffects, [training.effect]: true, last: effect };
    state.trainingHistory.push(effect);
    seat.trained = true;
    record(state, now, "TRAIN", roleId, { step: training.number, targetRole: training.targetRole, effect: training.effect });
    if (state.trainingStep === TRAINING_STEPS.length) {
      state.trainingSummary = { links: clone(state.trainingHistory), last: clone(effect) };
      state.operatorEvent = event("A9R_TRAINING_COMPLETE", "排演完成。你剛才的操作改變了隊友的控制台；現在用喊話把三個控制接起來。 ");
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
      markEvent(state, "operations", command.mode === "rail" ? "電力已切到救援軌道。" : command.mode === "gate" ? "電力已切回中央隔離閘。" : "電力已分流到兩邊。 ");
      break;
    case "TROLLEY_START":
      if (m.trolleyMoving) return fail(inputState, "DUPLICATE_ACTION", "救援車正在前進。 ");
      if (state.phase === "WINDOW1" && m.window1RouteLocked) return fail(inputState, "ROUTE_LOCKED", "救援車已停在第二標記；前方安全鎖等待第二波解除。 ");
      if (rates(state).railSpeed <= 0 || m.backupPower <= 0 || m.trolleyHeat >= 94) return fail(inputState, "IMPOSSIBLE_CONTROL", "救援車目前沒有可用的推進條件。 ");
      m.trolleyMoving = true; break;
    case "TROLLEY_STOP":
      if (!m.trolleyMoving) return fail(inputState, "DUPLICATE_ACTION", "救援車已停下。 ");
      m.trolleyMoving = false; break;
    case "BRACE_START":
      if (m.braceActive) return fail(inputState, "DUPLICATE_ACTION", "支撐正在受力。 ");
      if (m.braceStamina < 8) return fail(inputState, "IMPOSSIBLE_CONTROL", "支撐力尚未恢復。 ");
      m.braceActive = true; markEvent(state, "safety", "支撐已接上中央隔離閘。 "); break;
    case "BRACE_STOP":
      if (!m.braceActive) return fail(inputState, "DUPLICATE_ACTION", "支撐已放開。 ");
      m.braceActive = false; markEvent(state, "safety", "支撐已放開，力量正在恢復。 "); break;
    case "DEPLOY_SHIELD":
      if (state.phase !== "WINDOW2") return fail(inputState, "FUTURE_STAGE", "防濺屏要留到第二波。 ");
      if (!m.shieldAvailable) return fail(inputState, "DUPLICATE_ACTION", "防濺屏已使用。 ");
      m.shieldAvailable = false; m.shieldDeployed = true; markEvent(state, "safety", "防濺屏已升起；高承暴露下降。 "); break;
    case "SECURE_TROLLEY":
      if (state.phase !== "FINAL" || !m.linBoundary) return fail(inputState, "IMPOSSIBLE_CONTROL", "林芮還沒越過安全界線。 ");
      m.trolleyMoving = false; m.trolleySecured = true; markEvent(state, "rescue", "救援車與林芮已固定；立即告訴調度席。 "); break;
    case "RETREAT_GAO":
      if (state.phase !== "FINAL") return fail(inputState, "FUTURE_STAGE", "現在還不是撤離窗口。 ");
      m.gaoRetreated = true; m.braceActive = false; markEvent(state, "safety", "高承已後撤；現場支撐同時放開。 "); break;
    case "CLOSE_START":
      if (state.phase !== "FINAL") return fail(inputState, "FUTURE_STAGE", "關閘控制還不能使用。 ");
      if (m.closeActive) return fail(inputState, "DUPLICATE_ACTION", "關閘拉桿正在受力。 ");
      if (now < m.closeLockoutUntil) return fail(inputState, "IMPOSSIBLE_CONTROL", "關閘拉桿正在機械冷卻。 ");
      m.closeActive = true; m.closeAttempts += 1; m.closeStallMs = 0; markEvent(state, "operations", "關閘拉桿開始受力；等待機械回應。 "); break;
    case "CLOSE_STOP":
      if (!m.closeActive) return fail(inputState, "DUPLICATE_ACTION", "關閘拉桿已放開。 ");
      m.closeActive = false; markEvent(state, "operations", "關閘拉桿已放開。 "); break;
    case "HEARTBEAT":
      break;
    default:
      return fail(inputState, "MALFORMED_COMMAND", "這個控制不存在。 ");
  }
  record(state, now, command.type, roleId, command.mode ? { mode: command.mode } : {});
  if (state.phase === "FINAL" && m.closeProgress >= 100) completeOutcome(state, now, "GATE_CLOSED");
  if (LIVE_PHASES.includes(state.phase) && state.trainingSummary) state.trainingSummary = null;
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
  markEvent(state, "system", `${ROLE_LABELS[roleId]}暫時斷線；該席持續操作已安全放開。`);
  touch(state, now); state.version += 1;
  return { ok: true, state };
}

function timeLeftMs(state, now) { return state.deadlineAt ? Math.max(0, state.deadlineAt - now) : null; }
function sharedObjective(state) {
  if (state.phase === "WINDOW1") return "把林芮送到第二標記，同時別讓閘門進入危急。";
  if (state.phase === "WINDOW2") return "讓林芮越過安全界線，同時把閘門維持可控。";
  if (state.phase === "FINAL") return "林芮固定、支撐穩定後，抓住時機關閘。";
  return null;
}

function localStatus(state, roleId) {
  const m = state.metrics;
  if (roleId === "operations") return { kind: "condition", label: state.phase === "FINAL" ? "關閘進度" : "電力路由", value: state.phase === "FINAL" ? `${Math.round(m.closeProgress)}%` : ({ gate: "閘門", balanced: "分流", rail: "救援軌道" }[m.powerMode]) };
  if (roleId === "rescue") {
    if (state.phase === "WINDOW1") return { kind: "milestone", label: "第二標記", value: m.trolleyPosition >= 48 ? "已到達" : "尚未到達", done: m.trolleyPosition >= 48 };
    if (state.phase === "WINDOW2") return { kind: "milestone", label: "安全界線", value: m.linBoundary ? "已越過" : "尚未越過", done: m.linBoundary };
    if (state.phase === "FINAL") return { kind: "milestone", label: "林芮固定", value: m.trolleySecured ? "已完成" : "尚未完成", done: m.trolleySecured };
  }
  if (roleId === "safety") {
    if (state.phase === "FINAL") return { kind: "condition", label: "支撐安全帶", value: m.braceStable ? "目前穩定" : "尚未穩定", tone: m.braceStable ? "ok" : "warn" };
    return { kind: "condition", label: "閘門壓力", value: m.gatePressure >= 82 ? "危急" : m.gatePressure >= 62 ? "警戒" : "目前可控", tone: m.gatePressure >= 82 ? "danger" : m.gatePressure >= 62 ? "warn" : "ok" };
  }
  return null;
}

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
    briefing: {
      beat: state.briefingBeat,
      total: BRIEFING_BEATS.length,
      current: state.briefingBeat > 0 ? clone(BRIEFING_BEATS[state.briefingBeat - 1]) : null
    },
    training: {
      step: state.trainingStep,
      total: TRAINING_STEPS.length,
      expectedRole: state.trainingStep < TRAINING_STEPS.length ? TRAINING_STEPS[state.trainingStep].roleId : null,
      expectedRoleLabel: state.trainingStep < TRAINING_STEPS.length ? ROLE_LABELS[TRAINING_STEPS[state.trainingStep].roleId] : null,
      effects: clone(state.trainingEffects),
      lastEffect: state.trainingEffects.last ? clone(state.trainingEffects.last) : null,
      complete: state.trainingStep === TRAINING_STEPS.length,
      links: clone(state.trainingHistory)
    },
    sharedObjective: sharedObjective(state),
    localStatus: roleId ? localStatus(state, roleId) : null,
    currentSeat: seat ? { roleId, roleLabel: ROLE_LABELS[roleId], connected: seat.connected, started: seat.started, trained: seat.trained } : null,
    seats: ROLE_IDS.map((id) => ({ roleId: id, roleLabel: ROLE_LABELS[id], occupied: Boolean(state.seats[id].token), connected: state.seats[id].connected, started: state.seats[id].started, trained: state.seats[id].trained })),
    shared: { timerLabel: state.deadlineAt ? `${Math.ceil(timeLeftMs(state, now) / 1000)} 秒` : null, systemEvent: m.systemEvent, systemEventSerial: m.systemEventSerial },
    control: null,
    outcome: state.outcome ? clone(state.outcome) : null
  };
  if (!seat) return base;
  if (roleId === "operations") base.control = {
    type: "power-gate",
    powerMode: m.powerMode,
    backupPowerExact: round1(m.backupPower),
    closeActive: m.closeActive,
    closeProgressExact: round1(m.closeProgress),
    closeCooldownMs: Math.max(0, m.closeLockoutUntil - now),
    localEvent: m.operationsEvent,
    localEventSerial: m.operationsEventSerial
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
    routeLocked: state.phase === "WINDOW1" && m.window1RouteLocked,
    localEvent: m.rescueEvent,
    localEventSerial: m.rescueEventSerial
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
    railPowerCoarse: m.powerMode === "rail" ? "救援軌道正在高負載取電" : "救援軌道不是高負載",
    pressureWindowExact: state.phase === "FINAL" ? (m.finalRelief ? "現在可關閘" : now < state.phaseStartedAt + state.pressureWave.reliefStartMs ? "壓力波尚未過" : "安全窗口已過") : null,
    localEvent: m.safetyEvent,
    localEventSerial: m.safetyEventSerial
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
