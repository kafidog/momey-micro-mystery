import test from "node:test";
import assert from "node:assert/strict";
import * as a9 from "../../worker-a9/src/engine.js";
import * as a9r from "../src/engine.js";

const T0 = 1_800_200_000_000;
const ROLES = ["operations", "rescue", "safety"];

function issue(engine, state, tokens, roleId, type, extra = {}, now = state.metrics.lastAt + 1) {
  const result = engine.applyCommand(state, { type, roleId, token: tokens[roleId], phase: state.phase, version: state.version, ...extra }, now);
  assert.equal(result.ok, true, `${type} ${result.code || result.message || ""}`);
  return result.state;
}

function connect(engine, roomCode) {
  let state = engine.createRoom({ roomCode, now: T0 });
  const tokens = {};
  for (const roleId of ROLES) {
    const result = engine.connectSeat(state, { roleId, newToken: roleId + "-token", connectionId: roleId + "-device", now: T0 });
    state = result.state; tokens[roleId] = result.token;
  }
  for (const roleId of ROLES) state = issue(engine, state, tokens, roleId, "TAKEOVER");
  return { state, tokens };
}

function enterA9Window1() {
  const ctx = connect(a9, "A9C234");
  ctx.state = issue(a9, ctx.state, ctx.tokens, ctx.state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: "A9_INTRO" });
  for (const role of ROLES) ctx.state = issue(a9, ctx.state, ctx.tokens, role, "TRAIN");
  return ctx;
}

function enterA9RWindow1() {
  const ctx = connect(a9r, "A9R234");
  for (let beat = 1; beat <= 6; beat += 1) ctx.state = issue(a9r, ctx.state, ctx.tokens, ctx.state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: `A9R_BRIEFING_${beat}` });
  for (const role of ROLES) ctx.state = issue(a9r, ctx.state, ctx.tokens, role, "TRAIN");
  ctx.state = issue(a9r, ctx.state, ctx.tokens, ctx.state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: "A9R_TRAINING_COMPLETE" });
  return ctx;
}

function comparableProjection(engine, state, role, now) {
  const p = engine.projectRoomState(state, role, now);
  return { phase: p.phase, deadlineDelta: p.deadlineAt ? p.deadlineAt - state.phaseStartedAt : null, timeLeftMs: p.timeLeftMs, shared: p.shared, control: p.control, outcome: p.outcome };
}

function normalizedMetrics(state) {
  const metrics = structuredClone(state.metrics);
  metrics.lastAt = state.metrics.lastAt - state.phaseStartedAt;
  return metrics;
}

function assertEquivalent(a, r, label) {
  assert.equal(r.state.phase, a.state.phase, `${label} phase`);
  assert.deepEqual(normalizedMetrics(r.state), normalizedMetrics(a.state), `${label} metrics`);
  for (const role of ROLES) assert.deepEqual(comparableProjection(a9r, r.state, role, r.state.metrics.lastAt), comparableProjection(a9, a.state, role, a.state.metrics.lastAt), `${label} ${role} projection`);
  assert.deepEqual(r.state.outcome, a.state.outcome, `${label} outcome`);
}

function both(a, r, role, type, extra = {}, seconds = 0) {
  a.state = issue(a9, a.state, a.tokens, role, type, extra);
  r.state = issue(a9r, r.state, r.tokens, role, type, extra);
  if (seconds) {
    a.state = a9.materialize(a.state, a.state.metrics.lastAt + seconds * 1000);
    r.state = a9r.materialize(r.state, r.state.metrics.lastAt + seconds * 1000);
  }
}

test("A9R briefing has six ordered shared beats and safe cooperative training", () => {
  const ctx = connect(a9r, "BRF234");
  assert.equal(ctx.state.phase, "BRIEFING");
  for (let beat = 1; beat <= 6; beat += 1) {
    for (const role of ROLES) assert.equal(a9r.projectRoomState(ctx.state, role).briefing.beat, beat);
    const wrong = a9r.applyCommand(ctx.state, { type: "COMPLETE_OPERATOR", roleId: "rescue", token: ctx.tokens.rescue, phase: ctx.state.phase, version: ctx.state.version, eventId: `A9R_BRIEFING_${beat}` }, ctx.state.metrics.lastAt + 1);
    assert.equal(wrong.code, "NOT_AUDIO_MASTER");
    ctx.state = issue(a9r, ctx.state, ctx.tokens, ctx.state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: `A9R_BRIEFING_${beat}` });
  }
  assert.equal(ctx.state.phase, "TRAINING");
  const before = structuredClone(ctx.state.metrics);
  const wrongTurn = a9r.applyCommand(ctx.state, { type: "TRAIN", roleId: "rescue", token: ctx.tokens.rescue, phase: ctx.state.phase, version: ctx.state.version }, ctx.state.metrics.lastAt + 1);
  assert.equal(wrongTurn.code, "WRONG_ROLE");
  ctx.state = issue(a9r, ctx.state, ctx.tokens, "operations", "TRAIN");
  assert.equal(a9r.projectRoomState(ctx.state, "rescue").training.effects.railPower, true);
  ctx.state = issue(a9r, ctx.state, ctx.tokens, "rescue", "TRAIN");
  assert.equal(a9r.projectRoomState(ctx.state, "safety").training.effects.gateLoad, true);
  ctx.state = issue(a9r, ctx.state, ctx.tokens, "safety", "TRAIN");
  assert.equal(a9r.projectRoomState(ctx.state, "operations").training.effects.support, true);
  assert.deepEqual(ctx.state.metrics, before, "training must have no live cost");
  ctx.state = issue(a9r, ctx.state, ctx.tokens, ctx.state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: "A9R_TRAINING_COMPLETE" });
  assert.equal(ctx.state.phase, "WINDOW1");
  assert.deepEqual(ctx.state.metrics, a9.createRoom({ roomCode: "BASE00", now: ctx.state.phaseStartedAt }).metrics, "Window 1 starts with exact A9 metrics");
});

test("A9R live trace remains equal to A9 through coordinated outcome", () => {
  const a = enterA9Window1();
  const r = enterA9RWindow1();
  assertEquivalent(a, r, "start");
  both(a, r, "operations", "SET_POWER", { mode: "rail" });
  both(a, r, "rescue", "TROLLEY_START");
  both(a, r, "safety", "BRACE_START", {}, 12);
  both(a, r, "rescue", "TROLLEY_STOP");
  both(a, r, "safety", "BRACE_STOP");
  both(a, r, "operations", "SET_POWER", { mode: "gate" }, 10);
  both(a, r, "operations", "SET_POWER", { mode: "rail" });
  both(a, r, "rescue", "TROLLEY_START");
  both(a, r, "safety", "BRACE_START", {}, 9);
  both(a, r, "rescue", "TROLLEY_STOP");
  both(a, r, "safety", "BRACE_STOP");
  both(a, r, "operations", "SET_POWER", { mode: "gate" }, 39);
  assertEquivalent(a, r, "interlude");
  both(a, r, a.state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: "A9_WINDOW1_RESULT" });
  both(a, r, "safety", "DEPLOY_SHIELD");
  both(a, r, "operations", "SET_POWER", { mode: "rail" });
  both(a, r, "rescue", "TROLLEY_START");
  both(a, r, "safety", "BRACE_START", {}, 6);
  both(a, r, "rescue", "TROLLEY_STOP");
  both(a, r, "operations", "SET_POWER", { mode: "gate" }, 6);
  both(a, r, "safety", "BRACE_STOP", {}, 48);
  assertEquivalent(a, r, "final");
  both(a, r, "rescue", "SECURE_TROLLEY");
  both(a, r, "safety", "BRACE_START");
  both(a, r, "operations", "CLOSE_START", {}, 12);
  assertEquivalent(a, r, "outcome");
  assert.equal(r.state.outcome.variant, "COORDINATED_CLOSE");
});
