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
  state = send(state, tokens, "operations", "COMPLETE_OPERATOR", { eventId: "A9_INTRO" });
  assert.equal(state.phase, "TRAINING");
  return { state, tokens };
}

function startWindow1() {
  let { state, tokens } = startTraining();
  for (const roleId of ROLE_IDS) state = send(state, tokens, roleId, "TRAIN");
  assert.equal(state.phase, "WINDOW1");
  return { state, tokens };
}

test("three peers train simultaneously and enter the first live window", () => {
  let { state, tokens } = startTraining();
  for (const roleId of ROLE_IDS) state = send(state, tokens, roleId, "TRAIN");
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

test("Safety brace immediately changes Operations safe-window feedback", () => {
  let { state, tokens } = startWindow1();
  state.phase = "FINAL";
  state.deadlineAt = state.metrics.lastAt + 45_000;
  state.metrics.linBoundary = true;
  state.metrics.trolleySecured = true;
  state.metrics.gatePressure = 55;
  assert.equal(projectRoomState(state, "operations", state.metrics.lastAt).control.safetySupportCoarse, "支撐已放開");
  state = send(state, tokens, "safety", "BRACE_START");
  state = materialize(state, state.metrics.lastAt + 1000);
  assert.equal(projectRoomState(state, "operations", state.metrics.lastAt).control.safetySupportCoarse, "有人撐住");
  assert.equal(projectRoomState(state, "operations", state.metrics.lastAt).control.leverResistance, "負載可控");
});

test("Rescue checkpoint and boundary propagate to teammate projections", () => {
  let { state, tokens } = startWindow1();
  state = send(state, tokens, "operations", "SET_POWER", { mode: "rail" });
  state = send(state, tokens, "rescue", "TROLLEY_START");
  state = materialize(state, state.metrics.lastAt + 25_000);
  assert.ok(state.metrics.rescueCheckpoint >= 2);
  assert.notEqual(projectRoomState(state, "operations", state.metrics.lastAt).shared.trolley, "起點");
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
});

test("coordinated final hold reaches outcome and records all three role states", () => {
  let { state, tokens } = startWindow1();
  state.phase = "FINAL"; state.phaseStartedAt = state.metrics.lastAt; state.deadlineAt = state.metrics.lastAt + 45_000;
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
  state = send(state, tokens, "operations", "CLOSE_STOP");
  assert.equal(state.metrics.closeActive, false);
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
  state.deadlineAt = state.metrics.lastAt + 45_000;
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
