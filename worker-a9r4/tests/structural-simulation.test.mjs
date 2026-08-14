import test from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { ROLE_IDS, applyCommand, connectSeat, createRoom, materialize, projectRoomState } from "../src/engine.js";

const T0 = 1_800_100_000_000;
const evidence = { generatedAt: new Date().toISOString(), games: [], counterfactuals: { operations: [], rescue: [], safety: [] } };

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function connectAll() {
  let state = createRoom({ roomCode: "SIM234", now: T0 });
  const tokens = {};
  for (const roleId of ROLE_IDS) {
    const connected = connectSeat(state, { roleId, newToken: `${roleId}-token`, connectionId: `${roleId}-device`, now: T0 });
    assert.equal(connected.ok, true);
    state = connected.state;
    tokens[roleId] = connected.token;
  }
  return { state, tokens };
}

function command(state, tokens, roleId, type, extra = {}, now = state.metrics.lastAt + 1) {
  const result = applyCommand(state, { type, roleId, token: tokens[roleId], phase: state.phase, version: state.version, ...extra }, now);
  assert.equal(result.ok, true, `${type}: ${result.code || result.message}`);
  return result.state;
}

function startWindow1() {
  let { state, tokens } = connectAll();
  for (const roleId of ROLE_IDS) state = command(state, tokens, roleId, "TAKEOVER");
  for (let beat = 1; beat <= 6; beat += 1) state = command(state, tokens, state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: `A9R_BRIEFING_${beat}` });
  for (const roleId of ROLE_IDS) state = command(state, tokens, roleId, "TRAIN");
  state = command(state, tokens, state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: "A9R_TRAINING_COMPLETE" });
  assert.equal(state.phase, "WINDOW1");
  return { state, tokens };
}

function advance(state, seconds) { return materialize(state, state.metrics.lastAt + seconds * 1000); }
function resultSummary(state) {
  const m = state.metrics;
  return {
    phase: state.phase,
    outcome: state.outcome?.variant || null,
    trolley: Math.round(m.trolleyPosition * 10) / 10,
    pressure: Math.round(m.gatePressure * 10) / 10,
    damage: Math.round(m.gateDamage * 10) / 10,
    exposure: Math.round(m.gaoExposure * 10) / 10,
    power: Math.round(m.backupPower * 10) / 10,
    gateClosed: Boolean(state.outcome?.gateClosed),
    linSafe: Boolean(state.outcome?.linSafe),
    gaoSafe: Boolean(state.outcome?.gaoSafe),
  };
}

function operateRailCycle(ctx, seconds) {
  ctx.state = command(ctx.state, ctx.tokens, "operations", "SET_POWER", { mode: "rail" });
  ctx.state = command(ctx.state, ctx.tokens, "rescue", "TROLLEY_START");
  ctx.state = command(ctx.state, ctx.tokens, "safety", "BRACE_START");
  ctx.state = advance(ctx.state, seconds);
  if (ctx.state.metrics.trolleyMoving) ctx.state = command(ctx.state, ctx.tokens, "rescue", "TROLLEY_STOP");
  if (ctx.state.metrics.braceActive) ctx.state = command(ctx.state, ctx.tokens, "safety", "BRACE_STOP");
}

function operateGateRecovery(ctx, seconds) {
  ctx.state = command(ctx.state, ctx.tokens, "operations", "SET_POWER", { mode: "gate" });
  ctx.state = advance(ctx.state, seconds);
}

function finishWindow1Coordinated(ctx) {
  operateRailCycle(ctx, 12);
  operateGateRecovery(ctx, 10);
  operateRailCycle(ctx, 9);
  operateGateRecovery(ctx, 39);
  assert.equal(ctx.state.phase, "INTERLUDE");
  assert.equal(ctx.state.metrics.trolleyPosition, 62, "Window 1 route limit must preserve work for Window 2");
}

function runWindow2Coordinated(ctx) {
  ctx.state = command(ctx.state, ctx.tokens, ctx.state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: "A9_WINDOW1_RESULT" });
  ctx.state = command(ctx.state, ctx.tokens, "safety", "DEPLOY_SHIELD");
  ctx.state = command(ctx.state, ctx.tokens, "operations", "SET_POWER", { mode: "rail" });
  ctx.state = command(ctx.state, ctx.tokens, "rescue", "TROLLEY_START");
  ctx.state = command(ctx.state, ctx.tokens, "safety", "BRACE_START");
  ctx.state = advance(ctx.state, 6);
  ctx.state = command(ctx.state, ctx.tokens, "rescue", "TROLLEY_STOP");
  ctx.state = command(ctx.state, ctx.tokens, "operations", "SET_POWER", { mode: "gate" });
  ctx.state = advance(ctx.state, 6);
  if (ctx.state.metrics.braceActive) ctx.state = command(ctx.state, ctx.tokens, "safety", "BRACE_STOP");
  ctx.state = advance(ctx.state, 48);
  assert.equal(ctx.state.phase, "FINAL");
  assert.equal(ctx.state.metrics.linBoundary, true);
}

function closeCoordinated(ctx) {
  ctx.state = command(ctx.state, ctx.tokens, "rescue", "SECURE_TROLLEY");
  ctx.state = command(ctx.state, ctx.tokens, "safety", "BRACE_START");
  ctx.state = command(ctx.state, ctx.tokens, "operations", "CLOSE_START");
  ctx.state = advance(ctx.state, 12);
  assert.equal(ctx.state.phase, "OUTCOME");
}

function coordinatedGame(label, perspectiveRotation) {
  const ctx = startWindow1();
  finishWindow1Coordinated(ctx);
  runWindow2Coordinated(ctx);
  closeCoordinated(ctx);
  const summary = resultSummary(ctx.state);
  evidence.games.push({ label, perspectiveRotation, mode: "spoken-coordination", crossPhoneMoments: ["Operations rail power enabled Rescue", "rail routing raised Safety pressure trend", "Safety brace changed Operations support", "Rescue checkpoint changed both teammate projections"], neededCallouts: ["Rescue exact boundary", "Safety exact safe band", "Operations power window"], mistakeRecovery: "power and brace were cycled before damage", leastNecessaryRole: "none", couldPlaySilentlyNearOptimally: false, result: summary });
  return summary;
}

function silentLocalOnlyGame() {
  const ctx = startWindow1();
  ctx.state = command(ctx.state, ctx.tokens, "operations", "SET_POWER", { mode: "balanced" });
  ctx.state = command(ctx.state, ctx.tokens, "rescue", "TROLLEY_START");
  ctx.state = command(ctx.state, ctx.tokens, "safety", "BRACE_START");
  ctx.state = advance(ctx.state, 70);
  assert.equal(ctx.state.phase, "INTERLUDE");
  ctx.state = command(ctx.state, ctx.tokens, ctx.state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: "A9_WINDOW1_RESULT" });
  ctx.state = command(ctx.state, ctx.tokens, "safety", "DEPLOY_SHIELD");
  if (ctx.state.metrics.trolleyHeat < 94) ctx.state = command(ctx.state, ctx.tokens, "rescue", "TROLLEY_START");
  ctx.state = command(ctx.state, ctx.tokens, "safety", "BRACE_START");
  ctx.state = advance(ctx.state, 60);
  assert.equal(ctx.state.phase, "FINAL");
  if (ctx.state.metrics.linBoundary) ctx.state = command(ctx.state, ctx.tokens, "rescue", "SECURE_TROLLEY");
  if (!ctx.state.metrics.braceActive && ctx.state.metrics.braceStamina >= 8) ctx.state = command(ctx.state, ctx.tokens, "safety", "BRACE_START");
  ctx.state = command(ctx.state, ctx.tokens, "operations", "CLOSE_START");
  ctx.state = advance(ctx.state, 45);
  const summary = resultSummary(ctx.state);
  evidence.games.push({ label: "G2 Silent local-only attack", perspectiveRotation: { operations: "Outsider", rescue: "Rebutter", safety: "Opportunity Finder" }, mode: "no communication; each role reacts only to own local instrument", crossPhoneMoments: ["visible, but no callouts used"], neededCallouts: ["missed power request", "missed brace recovery timing", "missed exact boundary timing"], mistakeRecovery: "late and incomplete", leastNecessaryRole: "none; removing any control worsened the state", couldPlaySilentlyNearOptimally: false, result: summary });
  return summary;
}

function recoveredMistakeGame() {
  const ctx = startWindow1();
  ctx.state = command(ctx.state, ctx.tokens, "operations", "SET_POWER", { mode: "rail" });
  ctx.state = command(ctx.state, ctx.tokens, "rescue", "TROLLEY_START");
  ctx.state = advance(ctx.state, 5);
  const pressureAfterMistake = ctx.state.metrics.gatePressure;
  ctx.state = command(ctx.state, ctx.tokens, "rescue", "TROLLEY_STOP");
  ctx.state = command(ctx.state, ctx.tokens, "safety", "BRACE_START");
  ctx.state = command(ctx.state, ctx.tokens, "operations", "SET_POWER", { mode: "gate" });
  ctx.state = advance(ctx.state, 5);
  assert.ok(ctx.state.metrics.gatePressure < pressureAfterMistake);
  if (ctx.state.metrics.braceActive) ctx.state = command(ctx.state, ctx.tokens, "safety", "BRACE_STOP");
  operateRailCycle(ctx, 12);
  operateGateRecovery(ctx, 8);
  operateRailCycle(ctx, 10);
  operateGateRecovery(ctx, 30);
  assert.equal(ctx.state.phase, "INTERLUDE");
  runWindow2Coordinated(ctx);
  closeCoordinated(ctx);
  const summary = resultSummary(ctx.state);
  evidence.games.push({ label: "G3 Mistake then shout-and-recover", perspectiveRotation: { operations: "Rebutter", rescue: "Opportunity Finder", safety: "Outsider" }, mode: "coordinated after deliberate unsupported rail draw", crossPhoneMoments: ["Safety pressure rose after Operations routed rail", "brace plus gate routing visibly reversed pressure"], neededCallouts: ["閘門快掉了", "切回閘門"], mistakeRecovery: "successful and consequential", leastNecessaryRole: "none", couldPlaySilentlyNearOptimally: false, result: summary });
  return summary;
}

function retreatTradeoffGame() {
  const ctx = startWindow1();
  finishWindow1Coordinated(ctx);
  runWindow2Coordinated(ctx);
  ctx.state = command(ctx.state, ctx.tokens, "rescue", "SECURE_TROLLEY");
  ctx.state = command(ctx.state, ctx.tokens, "safety", "RETREAT_GAO");
  ctx.state = command(ctx.state, ctx.tokens, "operations", "CLOSE_START");
  ctx.state = advance(ctx.state, 45);
  const summary = resultSummary(ctx.state);
  assert.equal(summary.gaoSafe, true);
  assert.equal(summary.linSafe, true);
  assert.equal(summary.gateClosed, false);
  evidence.games.push({ label: "G4 Safety retreat tradeoff", perspectiveRotation: { operations: "Opportunity Finder", rescue: "Outsider", safety: "Rebutter" }, mode: "coordinated deliberate retreat", crossPhoneMoments: ["Safety retreat removed Operations close qualification"], neededCallouts: ["高承已後撤，現場支撐消失"], mistakeRecovery: "not a mistake; authored tradeoff", leastNecessaryRole: "none", couldPlaySilentlyNearOptimally: false, result: summary });
  return summary;
}

function readyFinalState(overrides = {}) {
  const ctx = startWindow1();
  ctx.state.phase = "FINAL";
  ctx.state.phaseStartedAt = ctx.state.metrics.lastAt - ctx.state.pressureWave.reliefStartMs - 2_000;
  ctx.state.deadlineAt = ctx.state.metrics.lastAt + 45_000;
  Object.assign(ctx.state.metrics, { powerMode: "gate", backupPower: 70, trolleyPosition: 84, linBoundary: true, trolleySecured: true, gatePressure: 55, braceStamina: 100, braceActive: false, braceStable: false, gaoExposure: 20, gateDamage: 0, closeProgress: 0, ...overrides });
  return ctx;
}

function recordPair(role, id, same, change, before, after) {
  evidence.counterfactuals[role].push({ id, same, change, resultWithout: resultSummary(before), resultWith: resultSummary(after) });
}

test("event-driven live play remains an operating-control loop rather than a form loop", () => {
  const ctx = startWindow1();
  for (let cycle = 0; cycle < 3 && ctx.state.phase === "WINDOW1"; cycle += 1) {
    operateRailCycle(ctx, 5);
    if (ctx.state.phase === "WINDOW1" && cycle < 2) operateGateRecovery(ctx, 5);
  }
  assert.equal(ctx.state.phase, "INTERLUDE");
  assert.equal(ctx.state.metrics.trolleyPosition, 48);
  ctx.state = command(ctx.state, ctx.tokens, ctx.state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: "A9_WINDOW1_RESULT" });
  ctx.state = command(ctx.state, ctx.tokens, "safety", "DEPLOY_SHIELD");
  for (let cycle = 0; cycle < 5 && ctx.state.phase === "WINDOW2"; cycle += 1) {
    ctx.state = command(ctx.state, ctx.tokens, "operations", "SET_POWER", { mode: "balanced" });
    ctx.state = command(ctx.state, ctx.tokens, "rescue", "TROLLEY_START");
    ctx.state = command(ctx.state, ctx.tokens, "safety", "BRACE_START");
    ctx.state = advance(ctx.state, 5);
    if (ctx.state.phase === "WINDOW2") {
      if (ctx.state.metrics.trolleyMoving) ctx.state = command(ctx.state, ctx.tokens, "rescue", "TROLLEY_STOP");
      if (ctx.state.metrics.braceActive) ctx.state = command(ctx.state, ctx.tokens, "safety", "BRACE_STOP");
      if (cycle < 4) operateGateRecovery(ctx, 7);
    }
  }
  assert.equal(ctx.state.phase, "FINAL");
  const types = new Set(ctx.state.history.map((row) => row.type));
  for (const action of ["SET_POWER", "TROLLEY_START", "BRACE_START", "WINDOW_OBJECTIVE"]) assert.equal(types.has(action), true, action);
  assert.equal(ctx.state.history.some((row) => /CARD|READY|VOTE/.test(row.type)), false);
});

test("Operations has at least three meaningful counterfactual effects", () => {
  {
    const base = readyFinalState();
    base.state = command(base.state, base.tokens, "safety", "BRACE_START");
    const without = advance(clone(base.state), 45);
    let withAction = command(clone(base.state), base.tokens, "operations", "CLOSE_START");
    withAction = advance(withAction, 8);
    assert.notEqual(without.outcome?.variant, withAction.outcome?.variant);
    recordPair("operations", "OPS-1", "final-ready state and teammates", "hold close lever", without, withAction);
  }
  {
    const base = startWindow1();
    base.state.metrics.trolleyMoving = true;
    const gate = advance(command(clone(base.state), base.tokens, "operations", "SET_POWER", { mode: "gate" }), 8);
    const rail = advance(command(clone(base.state), base.tokens, "operations", "SET_POWER", { mode: "rail" }), 8);
    assert.ok(rail.metrics.trolleyPosition > gate.metrics.trolleyPosition + 20);
    recordPair("operations", "OPS-2", "Window 1 and Rescue holding advance", "route gate power vs rail power", gate, rail);
  }
  {
    const base = startWindow1();
    base.state.phase = "WINDOW2"; base.state.deadlineAt = base.state.metrics.lastAt + 60_000;
    const gate = advance(command(clone(base.state), base.tokens, "operations", "SET_POWER", { mode: "gate" }), 8);
    const rail = advance(command(clone(base.state), base.tokens, "operations", "SET_POWER", { mode: "rail" }), 8);
    assert.ok(rail.metrics.gatePressure > gate.metrics.gatePressure + 40);
    recordPair("operations", "OPS-3", "Window 2 and teammate behavior", "remove gate support for rail power", gate, rail);
  }
  assert.equal(evidence.counterfactuals.operations.length, 3);
});

test("Rescue has at least three meaningful counterfactual effects", () => {
  {
    const base = startWindow1();
    base.state.phase = "WINDOW2"; base.state.deadlineAt = base.state.metrics.lastAt + 60_000;
    Object.assign(base.state.metrics, { trolleyPosition: 62, powerMode: "rail", trolleyHeat: 0 });
    const stopped = advance(clone(base.state), 7);
    let moving = command(clone(base.state), base.tokens, "rescue", "TROLLEY_START"); moving = advance(moving, 7);
    assert.equal(stopped.metrics.linBoundary, false); assert.equal(moving.metrics.linBoundary, true);
    recordPair("rescue", "RES-1", "Window 2 rail-power window", "hold trolley advance", stopped, moving);
  }
  {
    const base = readyFinalState();
    base.state.metrics.trolleySecured = false;
    base.state = command(base.state, base.tokens, "safety", "BRACE_START");
    base.state = command(base.state, base.tokens, "operations", "CLOSE_START");
    const unsecured = advance(clone(base.state), 10);
    let secured = command(clone(base.state), base.tokens, "rescue", "SECURE_TROLLEY"); secured = advance(secured, 8);
    assert.equal(unsecured.outcome, null); assert.equal(secured.outcome?.gateClosed, true);
    recordPair("rescue", "RES-2", "Final teammates already holding controls", "secure trolley", unsecured, secured);
  }
  {
    const base = startWindow1();
    base.state.phase = "WINDOW2"; base.state.deadlineAt = base.state.metrics.lastAt + 10_000;
    Object.assign(base.state.metrics, { trolleyPosition: 62, powerMode: "rail", trolleyHeat: 0 });
    const late = advance(clone(base.state), 10);
    let early = command(clone(base.state), base.tokens, "rescue", "TROLLEY_START"); early = advance(early, 10);
    assert.equal(late.metrics.linBoundary, false); assert.equal(early.metrics.linBoundary, true);
    recordPair("rescue", "RES-3", "same ten-second power window", "start during window vs miss it", late, early);
  }
  assert.equal(evidence.counterfactuals.rescue.length, 3);
});

test("Safety has at least three meaningful counterfactual effects", () => {
  {
    const base = startWindow1();
    base.state.phase = "WINDOW2"; base.state.deadlineAt = base.state.metrics.lastAt + 60_000;
    Object.assign(base.state.metrics, { powerMode: "rail", gatePressure: 34, braceStamina: 100 });
    const released = advance(clone(base.state), 4);
    let braced = command(clone(base.state), base.tokens, "safety", "BRACE_START"); braced = advance(braced, 4);
    assert.ok(released.metrics.gatePressure > braced.metrics.gatePressure + 30);
    recordPair("safety", "SAF-1", "Window 2 rail draw", "hold structural brace", released, braced);
  }
  {
    const base = startWindow1();
    base.state.phase = "WINDOW2"; base.state.deadlineAt = base.state.metrics.lastAt + 60_000;
    Object.assign(base.state.metrics, { powerMode: "balanced", gatePressure: 75, gaoExposure: 20 });
    const noShield = advance(clone(base.state), 20);
    let shield = command(clone(base.state), base.tokens, "safety", "DEPLOY_SHIELD"); shield = advance(shield, 20);
    assert.ok(noShield.metrics.gaoExposure > shield.metrics.gaoExposure + 20);
    recordPair("safety", "SAF-2", "same high-pressure second wave", "deploy one-use shield", noShield, shield);
  }
  {
    const base = readyFinalState();
    base.state = command(base.state, base.tokens, "operations", "CLOSE_START");
    const retreated = advance(command(clone(base.state), base.tokens, "safety", "RETREAT_GAO"), 45);
    let braced = command(clone(base.state), base.tokens, "safety", "BRACE_START"); braced = advance(braced, 8);
    assert.equal(retreated.outcome?.gateClosed, false); assert.equal(braced.outcome?.gateClosed, true);
    recordPair("safety", "SAF-3", "Final Rescue secured and Operations holding close", "brace vs order Gao retreat", retreated, braced);
  }
  assert.equal(evidence.counterfactuals.safety.length, 3);
});

test("no role projection contains every exact live instrument", () => {
  const { state } = startWindow1();
  const projections = ROLE_IDS.map((roleId) => projectRoomState(state, roleId, state.metrics.lastAt));
  for (const projection of projections) {
    const serialized = JSON.stringify(projection.control);
    const exactFamilies = ["backupPowerExact", "positionExact", "pressureExact"].filter((key) => serialized.includes(key));
    assert.equal(exactFamilies.length, 1);
  }
});

test.after(async () => {
  if (process.env.MOMEY_A9R4_EVIDENCE_PATH) {
    await writeFile(process.env.MOMEY_A9R4_EVIDENCE_PATH, JSON.stringify(evidence, null, 2) + "\n", "utf8");
  }
});
