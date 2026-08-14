import test from "node:test";
import assert from "node:assert/strict";
import * as a9r2 from "../../worker-a9r2/src/engine.js";
import * as a9r3 from "../src/engine.js";

const T0 = 1_800_200_000_000;
const ROLES = ["operations", "rescue", "safety"];

function issue(engine, state, tokens, roleId, type, extra = {}, now = state.metrics.lastAt + 1) {
  const result = engine.applyCommand(state, { type, roleId, token: tokens[roleId], phase: state.phase, version: state.version, ...extra }, now);
  assert.equal(result.ok, true, `${type} ${result.code || result.message || ""}`);
  return result.state;
}

function enterWindow1(engine, roomCode) {
  let state = engine.createRoom({ roomCode, now: T0 });
  const tokens = {};
  for (const roleId of ROLES) {
    const result = engine.connectSeat(state, { roleId, newToken: `${roleId}-token`, connectionId: `${roleId}-device`, now: T0 });
    state = result.state;
    tokens[roleId] = result.token;
  }
  for (const roleId of ROLES) state = issue(engine, state, tokens, roleId, "TAKEOVER");
  for (let beat = 1; beat <= 6; beat += 1) state = issue(engine, state, tokens, state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: `A9R_BRIEFING_${beat}` });
  for (const roleId of ROLES) state = issue(engine, state, tokens, roleId, "TRAIN");
  state = issue(engine, state, tokens, state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: "A9R_TRAINING_COMPLETE" });
  return { state, tokens };
}

function comparableMetrics(state) {
  const m = structuredClone(state.metrics);
  delete m.window1RouteLocked;
  delete m.latestMajorEvent;
  delete m.majorEventSerial;
  delete m.systemEvent;
  delete m.systemEventSerial;
  delete m.operationsEvent;
  delete m.operationsEventSerial;
  delete m.rescueEvent;
  delete m.rescueEventSerial;
  delete m.safetyEvent;
  delete m.safetyEventSerial;
  delete m.closeStallMs;
  delete m.closeLockoutUntil;
  delete m.finalRelief;
  m.lastAt -= state.phaseStartedAt;
  return m;
}

test("A9R3 preserves the six briefing beats and ordered cooperative training", () => {
  const ctx = enterWindow1(a9r3, "BRF234");
  assert.equal(ctx.state.phase, "WINDOW1");
  assert.equal(ctx.state.trainingHistory.length, 3);
  assert.deepEqual(ctx.state.trainingHistory.map((row) => row.targetRole), ["rescue", "safety", "operations"]);
  assert.equal(ctx.state.operatorEvent.id, "A9_WINDOW1_START");
  assert.equal(a9r3.projectRoomState(ctx.state, "operations", ctx.state.metrics.lastAt).sharedObjective, "把林芮送到第二標記，同時別讓閘門進入危急。");
});

test("A9R3 physics remains identical to A9R2 before the information-boundary change", () => {
  const base = enterWindow1(a9r2, "A9R334");
  const next = enterWindow1(a9r3, "A92234");
  for (const [role, type, extra] of [
    ["operations", "SET_POWER", { mode: "rail" }],
    ["rescue", "TROLLEY_START", {}],
    ["safety", "BRACE_START", {}]
  ]) {
    base.state = issue(a9r2, base.state, base.tokens, role, type, extra);
    next.state = issue(a9r3, next.state, next.tokens, role, type, extra);
  }
  base.state = a9r2.materialize(base.state, base.state.metrics.lastAt + 10_000);
  next.state = a9r3.materialize(next.state, next.state.metrics.lastAt + 10_000);
  assert.equal(base.state.phase, "WINDOW1");
  assert.equal(next.state.phase, "WINDOW1");
  assert.deepEqual(comparableMetrics(next.state), comparableMetrics(base.state));
});

test("A9R3 preserves A9R2 event-driven Window 1 timing and route lock", () => {
  const base = enterWindow1(a9r2, "OLD234");
  const next = enterWindow1(a9r3, "NEW234");
  for (const ctx of [base, next]) {
    const engine = ctx === base ? a9r2 : a9r3;
    ctx.state = issue(engine, ctx.state, ctx.tokens, "operations", "SET_POWER", { mode: "rail" });
    ctx.state = issue(engine, ctx.state, ctx.tokens, "rescue", "TROLLEY_START");
    ctx.state = issue(engine, ctx.state, ctx.tokens, "safety", "BRACE_START");
    ctx.state = engine.materialize(ctx.state, ctx.state.metrics.lastAt + 15_000);
  }
  assert.equal(base.state.phase, "INTERLUDE", "A9R2 advances when the objective is complete");
  assert.equal(next.state.phase, "INTERLUDE", "A9R3 preserves event-driven completion");
  assert.equal(next.state.phaseStartedAt, base.state.phaseStartedAt);
  assert.equal(next.state.metrics.trolleyPosition, 48);
  assert.equal(next.state.metrics.window1RouteLocked, true);
  assert.equal(next.state.history.at(-2).type, "WINDOW_OBJECTIVE");
});
