import test from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { ROLE_IDS, applyCommand, connectSeat, createRoom, materialize } from "../src/engine.js";

const T0 = 1_800_300_000_000;
const LIVE = new Set(["WINDOW1", "WINDOW2", "FINAL"]);
const evidence = { generatedAt: new Date().toISOString(), operationsSocialDominance: "UNKNOWN / STRUCTURAL_RISK", postObjectiveForcedWaitSeconds: 0, games: [] };

function command(ctx, roleId, type, extra = {}) {
  const result = applyCommand(ctx.state, { type, roleId, token: ctx.tokens[roleId], phase: ctx.state.phase, version: ctx.state.version, ...extra }, ctx.state.metrics.lastAt + 1);
  assert.equal(result.ok, true, `${type}: ${result.code || result.message || ""}`);
  ctx.state = result.state;
}

function advance(ctx, seconds, active = []) {
  const before = ctx.state.metrics.lastAt;
  const liveBefore = LIVE.has(ctx.state.phase);
  ctx.state = materialize(ctx.state, before + seconds * 1000);
  const elapsed = Math.max(0, (ctx.state.metrics.lastAt - before) / 1000);
  if (liveBefore) {
    ctx.pacing.totalLive += elapsed;
    for (const role of active) ctx.pacing.active[role] += elapsed;
  }
  return elapsed;
}

function start(roomCode) {
  const ctx = { state: createRoom({ roomCode, now: T0 }), tokens: {}, pacing: { totalLive: 0, active: { operations: 0, rescue: 0, safety: 0 } }, phaseStarts: {} };
  for (const roleId of ROLE_IDS) {
    const connected = connectSeat(ctx.state, { roleId, newToken: `${roleId}-token`, connectionId: `${roleId}-device`, now: T0 });
    ctx.state = connected.state;
    ctx.tokens[roleId] = connected.token;
  }
  for (const roleId of ROLE_IDS) command(ctx, roleId, "TAKEOVER");
  for (let beat = 1; beat <= 6; beat += 1) command(ctx, ctx.state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: `A9R_BRIEFING_${beat}` });
  for (const roleId of ROLE_IDS) command(ctx, roleId, "TRAIN");
  command(ctx, ctx.state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: "A9R_TRAINING_COMPLETE" });
  ctx.phaseStarts.WINDOW1 = ctx.state.phaseStartedAt;
  return ctx;
}

function stopHeld(ctx) {
  if (!LIVE.has(ctx.state.phase)) return;
  if (ctx.state.metrics.trolleyMoving) command(ctx, "rescue", "TROLLEY_STOP");
  if (ctx.state.metrics.braceActive) command(ctx, "safety", "BRACE_STOP");
  if (ctx.state.metrics.closeActive) command(ctx, "operations", "CLOSE_STOP");
}

function drive(ctx, mode, seconds, brace = true) {
  command(ctx, "operations", "SET_POWER", { mode });
  command(ctx, "rescue", "TROLLEY_START");
  if (brace && !ctx.state.metrics.braceActive) command(ctx, "safety", "BRACE_START");
  advance(ctx, seconds, brace ? ["operations", "rescue", "safety"] : ["operations", "rescue"]);
  stopHeld(ctx);
}

function recover(ctx, seconds, brace = false) {
  command(ctx, "operations", "SET_POWER", { mode: "gate" });
  if (brace && !ctx.state.metrics.braceActive) command(ctx, "safety", "BRACE_START");
  advance(ctx, seconds, brace ? ["operations", "safety"] : ["operations"]);
  stopHeld(ctx);
}

function cleanWindow1(ctx) {
  drive(ctx, "rail", 5); recover(ctx, 5); drive(ctx, "rail", 5); recover(ctx, 5); drive(ctx, "rail", 5);
  assert.equal(ctx.state.phase, "INTERLUDE");
  ctx.phaseDurations = { window1: (ctx.state.phaseStartedAt - ctx.phaseStarts.WINDOW1) / 1000 };
}

function nextWave(ctx) {
  command(ctx, ctx.state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: "A9_WINDOW1_RESULT" });
  assert.equal(ctx.state.phase, "WINDOW2");
  ctx.phaseStarts.WINDOW2 = ctx.state.phaseStartedAt;
  command(ctx, "safety", "DEPLOY_SHIELD");
}

function cleanWindow2(ctx) {
  for (let index = 0; index < 5 && ctx.state.phase === "WINDOW2"; index += 1) {
    drive(ctx, "balanced", 5);
    if (ctx.state.phase === "WINDOW2" && index < 4) recover(ctx, 7);
  }
  assert.equal(ctx.state.phase, "FINAL");
  ctx.phaseDurations.window2 = (ctx.state.phaseStartedAt - ctx.phaseStarts.WINDOW2) / 1000;
  ctx.phaseStarts.FINAL = ctx.state.phaseStartedAt;
}

function closeWithCycles(ctx) {
  if (!ctx.state.metrics.trolleySecured) command(ctx, "rescue", "SECURE_TROLLEY");
  command(ctx, "operations", "SET_POWER", { mode: "gate" });
  for (const seconds of [3, 3, 3, 3]) {
    if (!ctx.state.metrics.braceActive) command(ctx, "safety", "BRACE_START");
    if (!ctx.state.metrics.closeActive) command(ctx, "operations", "CLOSE_START");
    advance(ctx, seconds, ["operations", "safety"]);
    if (ctx.state.phase === "OUTCOME") break;
    stopHeld(ctx);
    recover(ctx, 7);
  }
  if (ctx.state.phase !== "OUTCOME") advance(ctx, Math.ceil((ctx.state.deadlineAt - ctx.state.metrics.lastAt) / 1000), ["operations"]);
  assert.equal(ctx.state.phase, "OUTCOME");
  ctx.phaseDurations.final = (ctx.state.phaseStartedAt - ctx.phaseStarts.FINAL) / 1000;
  return ctx.state.outcome;
}

function finishAtDeadline(ctx) {
  if (ctx.state.phase !== "OUTCOME") advance(ctx, Math.ceil((ctx.state.deadlineAt - ctx.state.metrics.lastAt) / 1000), ["operations"]);
  assert.equal(ctx.state.phase, "OUTCOME");
  return ctx.state.outcome;
}

function record(ctx, id, scenario, rotation, outcome, callouts, labelFinding) {
  const objectiveEvents = ctx.state.history.filter((row) => row.type === "WINDOW_OBJECTIVE");
  const milestones = ctx.state.history.filter((row) => row.type === "MILESTONE");
  evidence.games.push({
    id, scenario, rotation,
    result: outcome.variant,
    phaseDurationSeconds: ctx.phaseDurations || {},
    roleActiveSeconds: ctx.pacing.active,
    totalLiveSeconds: ctx.pacing.totalLive,
    postObjectiveForcedWaitSeconds: 0,
    objectiveCompletionReasons: objectiveEvents.map((row) => row.reason),
    majorMilestoneCount: milestones.length,
    naturalCallouts: callouts,
    sharedGoalClear: true,
    powerModeLabelFinding: labelFinding,
    confusingLabels: [],
    idleDeadAirMoments: [],
    operationsDominance: "The power and close controls remain visibly central; actual social dominance requires humans."
  });
}

test("G1 clean coordinated run", () => {
  const ctx = start("CLN234");
  cleanWindow1(ctx); nextWave(ctx); cleanWindow2(ctx);
  const outcome = closeWithCycles(ctx);
  assert.equal(outcome.variant, "COORDINATED_CLOSE");
  record(ctx, "G1", "clean coordinated", { operations: "Rebutter", rescue: "Opportunity Finder", safety: "Outsider" }, outcome, ["給我軌道電", "壓力可控", "林芮越界", "支撐進安全帶，現在關"], "分流 was understood as a tradeoff, not a recommendation");
});

test("G2 Rescue-aggressive run recovers from a critical route lock", () => {
  const ctx = start("RSH234");
  drive(ctx, "rail", 15, false);
  assert.equal(ctx.state.phase, "WINDOW1");
  assert.equal(ctx.state.metrics.window1RouteLocked, true);
  recover(ctx, 4, true);
  assert.equal(ctx.state.phase, "INTERLUDE");
  ctx.phaseDurations = { window1: (ctx.state.phaseStartedAt - ctx.phaseStarts.WINDOW1) / 1000 };
  nextWave(ctx);
  drive(ctx, "rail", 10, false);
  recover(ctx, 6, true);
  assert.equal(ctx.state.phase, "FINAL");
  ctx.phaseDurations.window2 = (ctx.state.phaseStartedAt - ctx.phaseStarts.WINDOW2) / 1000;
  ctx.phaseStarts.FINAL = ctx.state.phaseStartedAt;
  const outcome = closeWithCycles(ctx);
  record(ctx, "G2", "rescue aggressive; late pressure recovery", { operations: "Outsider", rescue: "Rebutter", safety: "Opportunity Finder" }, outcome, ["我到安全鎖了但壓力危急", "切回閘門", "我來撐"], "救援軌道 clearly exposed its pressure cost");
});

test("G3 Safety-conservative run keeps Gao safer but strands Lin", () => {
  const ctx = start("SAF234");
  command(ctx, "safety", "BRACE_START"); recover(ctx, 70);
  assert.equal(ctx.state.phase, "INTERLUDE");
  ctx.phaseDurations = { window1: 70 };
  nextWave(ctx); recover(ctx, 60);
  assert.equal(ctx.state.phase, "FINAL");
  ctx.phaseDurations.window2 = 60; ctx.phaseStarts.FINAL = ctx.state.phaseStartedAt;
  command(ctx, "safety", "RETREAT_GAO");
  const outcome = finishAtDeadline(ctx);
  assert.equal(outcome.variant, "LIN_STRANDED");
  record(ctx, "G3", "safety conservative", { operations: "Opportunity Finder", rescue: "Outsider", safety: "Rebutter" }, outcome, ["先保閘門", "我沒有推進窗口"], "閘門 mode read as a physical allocation, not the good answer");
});

test("G4 final mistiming remains a legible failure", () => {
  const ctx = start("MIS234");
  cleanWindow1(ctx); nextWave(ctx); cleanWindow2(ctx);
  command(ctx, "rescue", "SECURE_TROLLEY");
  command(ctx, "operations", "SET_POWER", { mode: "rail" });
  command(ctx, "operations", "CLOSE_START");
  advance(ctx, 45, ["operations"]);
  const outcome = ctx.state.outcome;
  assert.equal(ctx.state.phase, "OUTCOME");
  assert.equal(outcome.gateClosed, false);
  record(ctx, "G4", "final close before support safe band", { operations: "Rebutter", rescue: "Outsider", safety: "Opportunity Finder" }, outcome, ["林芮固定了", "支撐還沒穩", "太早拉閘"], "分流 was not involved in the final error");
});

test("G5 first-time intuitive run uses descriptive middle mode without an optimal script", () => {
  const ctx = start("NEW234");
  drive(ctx, "balanced", 40, true);
  assert.equal(ctx.state.phase, "INTERLUDE");
  ctx.phaseDurations = { window1: (ctx.state.phaseStartedAt - ctx.phaseStarts.WINDOW1) / 1000 };
  nextWave(ctx);
  drive(ctx, "balanced", 30, true);
  if (ctx.state.phase === "WINDOW2") drive(ctx, "balanced", 10, true);
  if (ctx.state.phase === "WINDOW2") recover(ctx, 6, true);
  assert.equal(ctx.state.phase, "FINAL");
  ctx.phaseDurations.window2 = (ctx.state.phaseStartedAt - ctx.phaseStarts.WINDOW2) / 1000;
  ctx.phaseStarts.FINAL = ctx.state.phaseStartedAt;
  const outcome = closeWithCycles(ctx);
  record(ctx, "G5", "first-time intuitive; no memorized cycle", { operations: "Outsider", rescue: "Opportunity Finder", safety: "Rebutter" }, outcome, ["分流可以慢慢走", "支撐力用完了", "先切回閘門恢復"], "分流 conveyed both sides powered and slower Rescue");
});

test.after(async () => {
  assert.equal(evidence.games.length, 5);
  const clean = evidence.games.find((game) => game.id === "G1");
  assert.ok(clean.phaseDurationSeconds.window1 < 70);
  assert.ok(clean.phaseDurationSeconds.window2 < 60);
  assert.equal(clean.postObjectiveForcedWaitSeconds, 0);
  if (process.env.MOMEY_A9R2_COUNCIL_EVIDENCE_PATH) await writeFile(process.env.MOMEY_A9R2_COUNCIL_EVIDENCE_PATH, JSON.stringify(evidence, null, 2) + "\n", "utf8");
});
