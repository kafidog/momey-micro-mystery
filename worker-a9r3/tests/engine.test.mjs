import test from "node:test";
import assert from "node:assert/strict";
import { ROLE_IDS, applyCommand, connectSeat, createRoom, disconnectSeat, materialize, projectRoomState } from "../src/engine.js";

const T0 = 1_800_000_000_000;

function connectAll() {
  let state = createRoom({ roomCode: "ABC234", now: T0 });
  const tokens = {};
  for (const roleId of ROLE_IDS) {
    const result = connectSeat(state, { roleId, newToken: roleId + "-token", connectionId: roleId + "-1", now: T0 });
    assert.equal(result.ok, true);
    state = result.state;
    tokens[roleId] = result.token;
  }
  return { state, tokens };
}

function send(state, tokens, roleId, type, extra = {}, now = state.metrics.lastAt + 1) {
  const result = applyCommand(state, { type, roleId, token: tokens[roleId], phase: state.phase, version: state.version, ...extra }, now);
  assert.equal(result.ok, true, `${type}: ${result.code || result.message}`);
  return result.state;
}

function startTraining() {
  let { state, tokens } = connectAll();
  for (const roleId of ROLE_IDS) state = send(state, tokens, roleId, "TAKEOVER");
  for (let beat = 1; beat <= 6; beat += 1) state = send(state, tokens, "operations", "COMPLETE_OPERATOR", { eventId: `A9R_BRIEFING_${beat}` });
  assert.equal(state.phase, "TRAINING");
  return { state, tokens };
}

function startWindow1() {
  let { state, tokens } = startTraining();
  for (const roleId of ROLE_IDS) state = send(state, tokens, roleId, "TRAIN");
  state = send(state, tokens, "operations", "COMPLETE_OPERATOR", { eventId: "A9R_TRAINING_COMPLETE" });
  assert.equal(state.phase, "WINDOW1");
  return { state, tokens };
}

function placeInsideFinalRelief(state, offsetMs = 2_000) {
  state.phaseStartedAt = state.metrics.lastAt - state.pressureWave.reliefStartMs - offsetMs;
  state.deadlineAt = state.metrics.lastAt + 45_000;
  return state;
}

test("three peers train cooperatively and enter the first live window", () => {
  let { state, tokens } = startTraining();
  for (const roleId of ROLE_IDS) state = send(state, tokens, roleId, "TRAIN");
  assert.equal(state.phase, "TRAINING");
  assert.equal(state.trainingStep, 3);
  state = send(state, tokens, "operations", "COMPLETE_OPERATOR", { eventId: "A9R_TRAINING_COMPLETE" });
  assert.equal(state.phase, "WINDOW1");
  assert.ok(state.deadlineAt > state.phaseStartedAt);
});

test("operations rail power immediately enables Rescue and worsens Safety trend", () => {
  let { state, tokens } = startWindow1();
  assert.equal(projectRoomState(state, "rescue", state.metrics.lastAt).control.railPowered, false);
  state = send(state, tokens, "operations", "SET_POWER", { mode: "rail" });
  assert.equal(projectRoomState(state, "rescue", state.metrics.lastAt).control.railPowered, true);
  assert.equal(projectRoomState(state, "safety", state.metrics.lastAt).control.pressureTrend, "快速上升");
});

test("Safety brace remains Safety-owned and does not reveal readiness to Operations", () => {
  let { state, tokens } = startWindow1();
  state.phase = "FINAL";
  placeInsideFinalRelief(state);
  state.metrics.linBoundary = true;
  state.metrics.trolleySecured = true;
  state.metrics.gatePressure = 55;
  const before = projectRoomState(state, "operations", state.metrics.lastAt);
  assert.equal(before.control.safetySupportCoarse, undefined);
  assert.equal(before.control.leverResistance, undefined);
  state = send(state, tokens, "safety", "BRACE_START");
  state = materialize(state, state.metrics.lastAt + 1000);
  const operations = projectRoomState(state, "operations", state.metrics.lastAt);
  const safety = projectRoomState(state, "safety", state.metrics.lastAt);
  assert.equal(operations.control.safetySupportCoarse, undefined);
  assert.equal(operations.control.leverResistance, undefined);
  assert.equal(safety.control.braceStableExact, true);
  assert.match(safety.control.localEvent, /安全帶/);
});

test("Rescue checkpoint remains Rescue-owned instead of propagating to teammates", () => {
  let { state, tokens } = startWindow1();
  state = send(state, tokens, "operations", "SET_POWER", { mode: "rail" });
  state = send(state, tokens, "rescue", "TROLLEY_START");
  state = materialize(state, state.metrics.lastAt + 25_000);
  assert.ok(state.metrics.rescueCheckpoint >= 2);
  const rescue = projectRoomState(state, "rescue", state.metrics.lastAt);
  const operations = projectRoomState(state, "operations", state.metrics.lastAt);
  assert.equal(rescue.control.checkpointExact, 2);
  assert.match(rescue.control.localEvent, /第二標記|安全鎖/);
  assert.equal(operations.shared.trolley, undefined);
  assert.equal(operations.control.checkpointExact, undefined);
});

test("role authorization and impossible live controls are server enforced", () => {
  const { state, tokens } = startWindow1();
  const wrong = applyCommand(state, { type: "TROLLEY_START", roleId: "operations", token: tokens.operations, phase: state.phase, version: state.version }, state.metrics.lastAt + 1);
  assert.equal(wrong.ok, false);
  assert.equal(wrong.code, "WRONG_ROLE");
  let gateState = send(state, tokens, "operations", "SET_POWER", { mode: "gate" });
  const noPower = applyCommand(gateState, { type: "TROLLEY_START", roleId: "rescue", token: tokens.rescue, phase: gateState.phase, version: gateState.version }, gateState.metrics.lastAt + 1);
  assert.equal(noPower.ok, false);
  assert.equal(noPower.code, "IMPOSSIBLE_CONTROL");
});

test("disconnect releases each held control to safe neutral", () => {
  let { state, tokens } = startWindow1();
  state = send(state, tokens, "operations", "SET_POWER", { mode: "rail" });
  state = send(state, tokens, "rescue", "TROLLEY_START");
  state = send(state, tokens, "safety", "BRACE_START");
  state.phase = "FINAL"; state.deadlineAt = state.metrics.lastAt + 45_000;
  state = send(state, tokens, "operations", "CLOSE_START");
  state = disconnectSeat(state, { roleId: "rescue", connectionId: "rescue-1", now: state.metrics.lastAt + 1 }).state;
  state = disconnectSeat(state, { roleId: "safety", connectionId: "safety-1", now: state.metrics.lastAt + 1 }).state;
  state = disconnectSeat(state, { roleId: "operations", connectionId: "operations-1", now: state.metrics.lastAt + 1 }).state;
  assert.equal(state.metrics.trolleyMoving, false);
  assert.equal(state.metrics.braceActive, false);
  assert.equal(state.metrics.closeActive, false);
});

test("stale and future envelopes cannot mutate authoritative state", () => {
  const { state, tokens } = startWindow1();
  for (const [phase, version, code] of [["TRAINING", state.version, "STALE_PHASE"], ["FINAL", state.version, "FUTURE_PHASE"], [state.phase, state.version - 1, "STALE_VERSION"], [state.phase, state.version + 1, "FUTURE_VERSION"]]) {
    const before = JSON.stringify(state);
    const result = applyCommand(state, { type: "SET_POWER", roleId: "operations", token: tokens.operations, phase, version, mode: "rail" }, state.metrics.lastAt);
    assert.equal(result.ok, false);
    assert.equal(result.code, code);
    assert.equal(JSON.stringify(state), before);
  }
});

test("local projections preserve exact role signals without a global exact dashboard", () => {
  const { state } = startWindow1();
  const operations = projectRoomState(state, "operations", state.metrics.lastAt);
  const rescue = projectRoomState(state, "rescue", state.metrics.lastAt);
  const safety = projectRoomState(state, "safety", state.metrics.lastAt);
  assert.equal(typeof operations.control.backupPowerExact, "number");
  assert.equal(operations.control.positionExact, undefined);
  assert.equal(typeof rescue.control.positionExact, "number");
  assert.equal(rescue.control.pressureExact, undefined);
  assert.equal(typeof safety.control.pressureExact, "number");
  assert.equal(safety.control.backupPowerExact, undefined);
  assert.equal(operations.shared.pressure, undefined);
  assert.equal(rescue.shared.power, undefined);
  assert.equal(safety.shared.trolley, undefined);
  assert.equal(typeof operations.sharedObjective, "string");
});

test("hard projection leak gate excludes teammate readiness and exact signals", () => {
  let { state } = startWindow1();
  state.phase = "FINAL";
  state.phaseStartedAt = state.metrics.lastAt;
  state.deadlineAt = state.metrics.lastAt + 45_000;
  Object.assign(state.metrics, { trolleyPosition: 88, rescueCheckpoint: 3, linBoundary: true, trolleySecured: true, gatePressure: 55, braceActive: true, braceStable: true, braceStamina: 74, backupPower: 63 });
  const operations = projectRoomState(state, "operations", state.metrics.lastAt);
  const rescue = projectRoomState(state, "rescue", state.metrics.lastAt);
  const safety = projectRoomState(state, "safety", state.metrics.lastAt);
  const common = projectRoomState(state, null, state.metrics.lastAt);
  const keys = (value, result = []) => {
    if (!value || typeof value !== "object") return result;
    for (const [key, child] of Object.entries(value)) { result.push(key); keys(child, result); }
    return result;
  };
  const operationKeys = keys(operations);
  const rescueKeys = keys(rescue);
  const safetyKeys = keys(safety);
  const commonKeys = keys(common);
  for (const forbidden of ["positionExact", "checkpointExact", "linBoundaryExact", "secured", "braceStableExact", "pressureExact", "pressureWindowExact", "braceStaminaExact", "gaoExposureExact", "safetySupportCoarse", "leverResistance"]) assert.equal(operationKeys.includes(forbidden), false, `Operations leaked ${forbidden}`);
  for (const forbidden of ["pressureExact", "braceStaminaExact", "braceStableExact", "backupPowerExact", "gateLoadCoarse"]) assert.equal(rescueKeys.includes(forbidden), false, `Rescue leaked ${forbidden}`);
  for (const forbidden of ["positionExact", "checkpointExact", "linBoundaryExact", "secured", "backupPowerExact"]) assert.equal(safetyKeys.includes(forbidden), false, `Safety leaked ${forbidden}`);
  for (const forbidden of ["positionExact", "checkpointExact", "linBoundaryExact", "secured", "pressureExact", "braceStableExact", "backupPowerExact", "phaseGoal", "trolley", "pressure", "power"]) assert.equal(commonKeys.includes(forbidden), false, `Common leaked ${forbidden}`);
  assert.equal(operations.sharedObjective, "林芮固定、支撐穩定後，抓住時機關閘。");
  assert.equal(operations.localStatus.value, "0%");
  assert.equal(rescue.localStatus.value, "已完成");
  assert.equal(safety.localStatus.value, "目前穩定");
});

test("coordinated final hold reaches outcome and records all three role states", () => {
  let { state, tokens } = startWindow1();
  state.phase = "FINAL"; state.phaseStartedAt = state.metrics.lastAt; state.deadlineAt = state.metrics.lastAt + 45_000;
  placeInsideFinalRelief(state);
  Object.assign(state.metrics, { linBoundary: true, trolleyPosition: 88, gatePressure: 55, braceStamina: 100, gaoExposure: 20, closeProgress: 0 });
  state = send(state, tokens, "rescue", "SECURE_TROLLEY");
  state = send(state, tokens, "safety", "BRACE_START");
  state = materialize(state, state.metrics.lastAt + 1000);
  state = send(state, tokens, "operations", "CLOSE_START");
  state = materialize(state, state.metrics.lastAt + 8000);
  assert.equal(state.phase, "OUTCOME");
  assert.equal(state.outcome.variant, "COORDINATED_CLOSE");
  assert.equal(state.outcome.causal.length, 3);
});

test("a premature close is recoverable but costs pressure and progress", () => {
  let { state, tokens } = startWindow1();
  state.phase = "FINAL"; state.deadlineAt = state.metrics.lastAt + 45_000;
  const beforePressure = state.metrics.gatePressure;
  state = send(state, tokens, "operations", "CLOSE_START");
  state = materialize(state, state.metrics.lastAt + 4000);
  assert.equal(state.metrics.closeProgress, 0);
  assert.ok(state.metrics.gatePressure > beforePressure);
  assert.equal(state.metrics.closeActive, false);
  assert.ok(state.metrics.closeLockoutUntil > state.metrics.lastAt);
  assert.ok(state.metrics.gateDamage >= 8);
});

test("late heartbeat never grants operation time beyond the authoritative deadline", () => {
  let { state, tokens } = startWindow1();
  state = send(state, tokens, "operations", "SET_POWER", { mode: "rail" });
  state = send(state, tokens, "rescue", "TROLLEY_START");
  const deadline = state.deadlineAt;
  const exactlyAtDeadline = materialize(state, deadline);
  const tenSecondsLate = materialize(state, deadline + 10_000);
  assert.equal(exactlyAtDeadline.phase, "INTERLUDE");
  assert.equal(tenSecondsLate.phase, "INTERLUDE");
  assert.equal(tenSecondsLate.metrics.trolleyPosition, exactlyAtDeadline.metrics.trolleyPosition);
  assert.equal(tenSecondsLate.metrics.backupPower, exactlyAtDeadline.metrics.backupPower);
  assert.equal(tenSecondsLate.metrics.gateDamage, exactlyAtDeadline.metrics.gateDamage);
});

test("authoritative clock completes a fully closed gate without another client command", () => {
  let { state } = startWindow1();
  state.phase = "FINAL";
  placeInsideFinalRelief(state);
  Object.assign(state.metrics, {
    linBoundary: true,
    trolleySecured: true,
    braceActive: true,
    braceStamina: 100,
    braceStable: true,
    gaoRetreated: false,
    gatePressure: 40,
    closeActive: true,
    closeProgress: 95,
  });
  const projected = materialize(state, state.metrics.lastAt + 1000);
  assert.equal(projected.phase, "OUTCOME");
  assert.equal(projected.outcome.reason, "GATE_CLOSED");
  assert.equal(projected.outcome.gateClosed, true);
});

test("Window 1 completes early at the visible second-marker goal", () => {
  let { state, tokens } = startWindow1();
  const deadline = state.deadlineAt;
  state = send(state, tokens, "operations", "SET_POWER", { mode: "rail" });
  state = send(state, tokens, "rescue", "TROLLEY_START");
  state = send(state, tokens, "safety", "BRACE_START");
  state = materialize(state, state.metrics.lastAt + 5_000);
  state = send(state, tokens, "rescue", "TROLLEY_STOP");
  state = send(state, tokens, "safety", "BRACE_STOP");
  state = send(state, tokens, "operations", "SET_POWER", { mode: "gate" });
  state = materialize(state, state.metrics.lastAt + 5_000);
  state = send(state, tokens, "operations", "SET_POWER", { mode: "rail" });
  state = send(state, tokens, "rescue", "TROLLEY_START");
  state = send(state, tokens, "safety", "BRACE_START");
  state = materialize(state, state.metrics.lastAt + 5_000);
  state = send(state, tokens, "rescue", "TROLLEY_STOP");
  state = send(state, tokens, "safety", "BRACE_STOP");
  state = send(state, tokens, "operations", "SET_POWER", { mode: "gate" });
  state = materialize(state, state.metrics.lastAt + 5_000);
  state = send(state, tokens, "operations", "SET_POWER", { mode: "rail" });
  state = send(state, tokens, "rescue", "TROLLEY_START");
  state = send(state, tokens, "safety", "BRACE_START");
  state = materialize(state, state.metrics.lastAt + 5_000);
  assert.equal(state.phase, "INTERLUDE");
  assert.equal(state.metrics.trolleyPosition, 48);
  assert.equal(state.metrics.window1RouteLocked, true);
  assert.ok(state.phaseStartedAt < deadline);
  assert.match(state.operatorEvent.caption, /第一段目標完成/);
});

test("Window 1 route lock is explicit when pressure blocks early completion", () => {
  let { state, tokens } = startWindow1();
  state = send(state, tokens, "operations", "SET_POWER", { mode: "rail" });
  state = send(state, tokens, "rescue", "TROLLEY_START");
  state = materialize(state, state.metrics.lastAt + 20_000);
  assert.equal(state.phase, "WINDOW1");
  assert.equal(state.metrics.trolleyPosition, 48);
  const rescue = projectRoomState(state, "rescue", state.metrics.lastAt);
  assert.equal(rescue.control.routeLocked, true);
  assert.match(rescue.control.localEvent, /安全鎖|第二標記/);
  const blocked = applyCommand(state, { type: "TROLLEY_START", roleId: "rescue", token: tokens.rescue, phase: state.phase, version: state.version }, state.metrics.lastAt + 1);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.code, "ROUTE_LOCKED");
});

test("Window 2 enters Final early once Lin crosses and gate pressure is controllable", () => {
  let { state, tokens } = startWindow1();
  state.phase = "WINDOW2";
  state.phaseStartedAt = state.metrics.lastAt;
  state.deadlineAt = state.metrics.lastAt + 60_000;
  Object.assign(state.metrics, { trolleyPosition: 80, rescueCheckpoint: 3, gatePressure: 80, powerMode: "rail", trolleyMoving: true, braceActive: true, braceStamina: 80, shieldDeployed: true, shieldAvailable: false });
  state = materialize(state, state.metrics.lastAt + 1_000);
  assert.equal(state.metrics.linBoundary, true);
  assert.equal(state.phase, "WINDOW2", "critical pressure must prevent early transition");
  state = send(state, tokens, "operations", "SET_POWER", { mode: "gate" });
  state = materialize(state, state.metrics.lastAt + 3_000);
  assert.equal(state.phase, "FINAL");
  assert.ok(state.deadlineAt > state.phaseStartedAt);
  const operations = projectRoomState(state, "operations", state.metrics.lastAt);
  assert.equal(operations.sharedObjective, "林芮固定、支撐穩定後，抓住時機關閘。");
  assert.equal(operations.phaseGoal, undefined);
  assert.equal(operations.control.linBoundaryExact, undefined);
  assert.equal(operations.control.braceStableExact, undefined);
});

test("outcome includes a four-step causal recap in addition to metrics", () => {
  let { state, tokens } = startWindow1();
  state.phase = "FINAL";
  placeInsideFinalRelief(state);
  Object.assign(state.metrics, { linBoundary: true, trolleyPosition: 88, trolleySecured: true, gatePressure: 45, braceActive: true, braceStable: true, braceStamina: 100, gaoExposure: 20, closeActive: true, closeProgress: 99 });
  state = materialize(state, state.metrics.lastAt + 1_000);
  assert.equal(state.phase, "OUTCOME");
  assert.equal(state.outcome.recap.length, 4);
  assert.match(state.outcome.recap.join(" "), /第二標記/);
  assert.equal(state.outcome.causal.length, 3);
});
