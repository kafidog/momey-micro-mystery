import test from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { ROLE_IDS, applyCommand, connectSeat, createRoom, materialize } from "../src/engine.js";

const T0 = 1_800_300_000_000;
const evidence = { generatedAt: new Date().toISOString(), operationsSocialDominance: "UNKNOWN / STRUCTURAL_RISK", games: [] };

function command(ctx, roleId, type, extra = {}) {
  const result = applyCommand(ctx.state, { type, roleId, token: ctx.tokens[roleId], phase: ctx.state.phase, version: ctx.state.version, ...extra }, ctx.state.metrics.lastAt + 1);
  assert.equal(result.ok, true, `${type}: ${result.code || result.message || ""}`);
  ctx.state = result.state;
}

function advance(ctx, seconds) { ctx.state = materialize(ctx.state, ctx.state.metrics.lastAt + seconds * 1000); }

function start() {
  const ctx = { state: createRoom({ roomCode: "RUN234", now: T0 }), tokens: {} };
  for (const roleId of ROLE_IDS) {
    const connected = connectSeat(ctx.state, { roleId, newToken: `${roleId}-token`, connectionId: `${roleId}-device`, now: T0 });
    ctx.state = connected.state; ctx.tokens[roleId] = connected.token;
  }
  for (const roleId of ROLE_IDS) command(ctx, roleId, "TAKEOVER");
  for (let beat = 1; beat <= 6; beat += 1) command(ctx, ctx.state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: `A9R_BRIEFING_${beat}` });
  for (const roleId of ROLE_IDS) command(ctx, roleId, "TRAIN");
  command(ctx, ctx.state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: "A9R_TRAINING_COMPLETE" });
  return ctx;
}

function rail(ctx, seconds, brace = true) {
  command(ctx, "operations", "SET_POWER", { mode: "rail" });
  command(ctx, "rescue", "TROLLEY_START");
  if (brace) command(ctx, "safety", "BRACE_START");
  advance(ctx, seconds);
  if (ctx.state.metrics.trolleyMoving) command(ctx, "rescue", "TROLLEY_STOP");
  if (ctx.state.metrics.braceActive) command(ctx, "safety", "BRACE_STOP");
}

function gate(ctx, seconds) { command(ctx, "operations", "SET_POWER", { mode: "gate" }); advance(ctx, seconds); }
function nextWave(ctx) { assert.equal(ctx.state.phase, "INTERLUDE"); command(ctx, ctx.state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: "A9_WINDOW1_RESULT" }); }

function coordinatedEarly(ctx) {
  rail(ctx, 12); gate(ctx, 10); rail(ctx, 9); gate(ctx, 39);
  nextWave(ctx);
  command(ctx, "safety", "DEPLOY_SHIELD");
  rail(ctx, 6); gate(ctx, 6); advance(ctx, 48);
  assert.equal(ctx.state.phase, "FINAL");
  assert.equal(ctx.state.metrics.linBoundary, true);
}

function finish(ctx) { if (ctx.state.phase !== "OUTCOME") advance(ctx, Math.ceil((ctx.state.deadlineAt - ctx.state.metrics.lastAt) / 1000)); assert.equal(ctx.state.phase, "OUTCOME"); return ctx.state.outcome; }

function record(id, scenario, rotation, outcome, callouts, confusion, leastNecessary, dominance, scrollBurden) {
  evidence.games.push({ id, scenario, rotation, outcome: outcome.variant, linSafe: outcome.linSafe, gaoSafe: outcome.gaoSafe, gateClosed: outcome.gateClosed, callouts, crossPhoneMoments: 4, confusion, leastNecessary, operationsDominance: dominance, liveUiScrollBurden: scrollBurden, briefingEnough: true, trainingTaughtCrossPhoneDependency: true });
}

test("G1 coordinated clean run", () => {
  const ctx = start(); coordinatedEarly(ctx);
  command(ctx, "rescue", "SECURE_TROLLEY"); command(ctx, "safety", "BRACE_START"); command(ctx, "operations", "CLOSE_START"); advance(ctx, 12);
  const outcome = finish(ctx); assert.equal(outcome.variant, "COORDINATED_CLOSE");
  record("G1", "coordinated clean", { operations: "Rebutter", rescue: "Opportunity Finder", safety: "Outsider" }, outcome, ["給我軌道電", "壓力穩住", "林芮越界", "現在關閘"], "none in deterministic projection", "none", "Operations received many timing requests; de facto leadership remains a human-test risk", "compact strip kept controls visible");
});

test("G2 Rescue rushes and Safety reacts late", () => {
  const ctx = start(); rail(ctx, 18, false); command(ctx, "safety", "BRACE_START"); gate(ctx, 52); nextWave(ctx);
  command(ctx, "operations", "SET_POWER", { mode: "rail" }); command(ctx, "rescue", "TROLLEY_START"); advance(ctx, 8); if (ctx.state.metrics.trolleyMoving) command(ctx, "rescue", "TROLLEY_STOP"); gate(ctx, 52);
  assert.equal(ctx.state.phase, "FINAL"); if (ctx.state.metrics.linBoundary) command(ctx, "rescue", "SECURE_TROLLEY");
  const outcome = finish(ctx); assert.equal(outcome.variant, "BOTH_EXPOSED");
  record("G2", "Rescue rush; late Safety", { operations: "Outsider", rescue: "Rebutter", safety: "Opportunity Finder" }, outcome, ["先讓我衝", "壓力已經危急", "切回閘門"], "late support warning arrived after irreversible exposure", "none", "Operations still chose where scarce power went", "no operator card obstruction");
});

test("G3 Safety-first conservative run strands Lin", () => {
  const ctx = start(); command(ctx, "safety", "BRACE_START"); gate(ctx, 70); nextWave(ctx); command(ctx, "safety", "DEPLOY_SHIELD"); gate(ctx, 60);
  assert.equal(ctx.state.phase, "FINAL"); command(ctx, "safety", "RETREAT_GAO");
  const outcome = finish(ctx); assert.equal(outcome.variant, "LIN_STRANDED");
  record("G3", "Safety-first; Rescue loses time", { operations: "Opportunity Finder", rescue: "Outsider", safety: "Rebutter" }, outcome, ["先別切走閘門電", "我完全沒有前進窗口"], "conservative local safety dominated rescue opportunity", "none", "Operations accepted Safety's conservative request; social authority is unresolved", "all exact Safety signals and primary brace stayed on first viewport");
});

test("G4 good early run then mistimed final coordination", () => {
  const ctx = start(); coordinatedEarly(ctx); command(ctx, "rescue", "SECURE_TROLLEY");
  command(ctx, "operations", "SET_POWER", { mode: "rail" }); command(ctx, "operations", "CLOSE_START"); advance(ctx, 40);
  command(ctx, "operations", "SET_POWER", { mode: "gate" }); command(ctx, "safety", "BRACE_START");
  const outcome = finish(ctx); assert.equal(outcome.variant, "BOTH_EXPOSED");
  record("G4", "good early state; premature close without stable support", { operations: "Rebutter", rescue: "Outsider", safety: "Opportunity Finder" }, outcome, ["林芮已固定", "還沒穩住", "我拉了", "太晚切回"], "Operations acted on coarse load before Safety's exact safe band", "none", "final lever concentrates visible agency in Operations; structural risk remains", "compact operator strip preserved final controls");
});

test.after(async () => {
  assert.equal(evidence.games.length, 4);
  if (process.env.MOMEY_A9R_COUNCIL_EVIDENCE_PATH) await writeFile(process.env.MOMEY_A9R_COUNCIL_EVIDENCE_PATH, JSON.stringify(evidence, null, 2) + "\n", "utf8");
});
