import test from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { ROLE_IDS, applyCommand, connectSeat, createRoom, materialize, projectRoomState } from "../src/engine.js";

const T0 = 1_800_800_000_000;
const evidence = { generatedAt: new Date().toISOString(), operationsSocialDominanceRisk: "IMPROVED / REAL-HUMAN UNKNOWN", games: [] };

function command(ctx, roleId, type, extra = {}) {
  const visible = projectRoomState(ctx.state, roleId, ctx.state.metrics.lastAt);
  const result = applyCommand(ctx.state, { type, roleId, token: ctx.tokens[roleId], phase: visible.phase, version: visible.version, ...extra }, ctx.state.metrics.lastAt + 1);
  assert.equal(result.ok, true, `${type}: ${result.code || result.message || ""}`);
  ctx.state = result.state;
}

function advance(ctx, seconds) { ctx.state = materialize(ctx.state, ctx.state.metrics.lastAt + seconds * 1000); }

function start(roomCode) {
  const ctx = { state: createRoom({ roomCode, now: T0 }), tokens: {}, phaseDurations: {} };
  for (const roleId of ROLE_IDS) {
    const connected = connectSeat(ctx.state, { roleId, newToken: `${roleId}-token`, connectionId: `${roleId}-device`, now: T0 });
    ctx.state = connected.state;
    ctx.tokens[roleId] = connected.token;
  }
  for (const roleId of ROLE_IDS) command(ctx, roleId, "TAKEOVER");
  for (let beat = 1; beat <= 6; beat += 1) command(ctx, ctx.state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: `A9R_BRIEFING_${beat}` });
  for (const roleId of ROLE_IDS) command(ctx, roleId, "TRAIN");
  command(ctx, ctx.state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: "A9R_TRAINING_COMPLETE" });
  ctx.window1StartedAt = ctx.state.phaseStartedAt;
  return ctx;
}

function stopHeld(ctx) {
  if (ctx.state.metrics.trolleyMoving) command(ctx, "rescue", "TROLLEY_STOP");
  if (ctx.state.metrics.braceActive) command(ctx, "safety", "BRACE_STOP");
  if (ctx.state.metrics.closeActive) command(ctx, "operations", "CLOSE_STOP");
}

function drive(ctx, mode, seconds) {
  command(ctx, "operations", "SET_POWER", { mode });
  command(ctx, "rescue", "TROLLEY_START");
  if (!ctx.state.metrics.braceActive) command(ctx, "safety", "BRACE_START");
  advance(ctx, seconds);
  stopHeld(ctx);
}

function recover(ctx, seconds) {
  command(ctx, "operations", "SET_POWER", { mode: "gate" });
  advance(ctx, seconds);
}

function reachFinal(ctx) {
  drive(ctx, "rail", 5); recover(ctx, 5); drive(ctx, "rail", 5); recover(ctx, 5); drive(ctx, "rail", 5);
  assert.equal(ctx.state.phase, "INTERLUDE");
  ctx.phaseDurations.window1 = (ctx.state.phaseStartedAt - ctx.window1StartedAt) / 1000;
  command(ctx, ctx.state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: "A9_WINDOW1_RESULT" });
  ctx.window2StartedAt = ctx.state.phaseStartedAt;
  command(ctx, "safety", "DEPLOY_SHIELD");
  for (let cycle = 0; cycle < 6 && ctx.state.phase === "WINDOW2"; cycle += 1) {
    drive(ctx, "balanced", 5);
    if (ctx.state.phase === "WINDOW2") recover(ctx, 6);
  }
  assert.equal(ctx.state.phase, "FINAL");
  ctx.phaseDurations.window2 = (ctx.state.phaseStartedAt - ctx.window2StartedAt) / 1000;
  ctx.finalStartedAt = ctx.state.phaseStartedAt;
  command(ctx, "operations", "SET_POWER", { mode: "gate" });
}

function safetyMaintainUntilWindow(ctx) {
  for (let second = 0; second < 44 && ctx.state.phase === "FINAL"; second += 1) {
    const safety = projectRoomState(ctx.state, "safety", ctx.state.metrics.lastAt).control;
    if (safety.pressureWindowExact === "現在可關閘" && safety.braceStaminaExact >= 50) {
      if (!safety.braceActive) command(ctx, "safety", "BRACE_START");
      advance(ctx, 1);
      if (projectRoomState(ctx.state, "safety", ctx.state.metrics.lastAt).control.braceStableExact) return;
    } else {
      if (safety.braceActive && (safety.braceStaminaExact < 20 || safety.pressureExact < 52)) command(ctx, "safety", "BRACE_STOP");
      else if (!safety.braceActive && safety.pressureExact >= 70 && safety.braceStaminaExact >= 58) command(ctx, "safety", "BRACE_START");
      advance(ctx, 1);
    }
  }
  assert.fail("Safety never reached its role-local final window");
}

function coordinatedClose(ctx, { rescueCallDelay = 0, safetyCallDelay = 0, prematurePulls = 0 } = {}) {
  for (let pull = 0; pull < prematurePulls; pull += 1) {
    command(ctx, "operations", "CLOSE_START");
    advance(ctx, 2);
    assert.ok(ctx.state.metrics.gateDamage >= (pull + 1) * 24);
    if (pull + 1 < prematurePulls && ctx.state.metrics.closeLockoutUntil > ctx.state.metrics.lastAt) {
      advance(ctx, Math.ceil((ctx.state.metrics.closeLockoutUntil - ctx.state.metrics.lastAt) / 1000));
    }
  }
  command(ctx, "rescue", "SECURE_TROLLEY");
  if (rescueCallDelay) advance(ctx, rescueCallDelay);
  safetyMaintainUntilWindow(ctx);
  if (safetyCallDelay) advance(ctx, safetyCallDelay);
  if (ctx.state.metrics.closeLockoutUntil > ctx.state.metrics.lastAt) advance(ctx, Math.ceil((ctx.state.metrics.closeLockoutUntil - ctx.state.metrics.lastAt) / 1000));
  if (!ctx.state.metrics.braceActive) command(ctx, "safety", "BRACE_START");
  command(ctx, "operations", "CLOSE_START");
  advance(ctx, 9);
  if (ctx.state.phase === "FINAL") advance(ctx, Math.ceil((ctx.state.deadlineAt - ctx.state.metrics.lastAt) / 1000));
  return ctx.state.outcome;
}

function silentFinal(ctx) {
  command(ctx, "rescue", "SECURE_TROLLEY");
  for (let second = 0; second < 45 && ctx.state.phase === "FINAL"; second += 1) {
    const safety = projectRoomState(ctx.state, "safety", ctx.state.metrics.lastAt).control;
    if (safety.pressureWindowExact === "現在可關閘" && !safety.braceActive && safety.braceStaminaExact >= 50) command(ctx, "safety", "BRACE_START");
    if (second === 6) command(ctx, "operations", "CLOSE_START");
    advance(ctx, 1);
  }
  return ctx.state.outcome;
}

function record(ctx, id, scenario, rotation, outcome, callouts, ownedFact, leaked, recovery) {
  evidence.games.push({
    id, scenario, rotation, result: outcome.variant, pressureWave: ctx.state.pressureWave.id,
    gateDamage: outcome.metrics.gateDamage,
    gateStatus: outcome.details.gate,
    linRuiStatus: outcome.details.linRui.status,
    gaoChengStatus: outcome.details.gaoCheng.status,
    reboundCount: outcome.recovery.reboundCount,
    contributions: outcome.contributions.map((row) => ({ roleId: row.roleId, sourceLabel: row.sourceLabel, line: row.line })),
    phaseDurationSeconds: ctx.phaseDurations,
    naturalCallouts: callouts,
    roleOwnedFactThatMattered: ownedFact,
    sameFactLeakedByAnotherPhone: leaked,
    recovery,
    operationsDominance: "Operations owns the lever but no Rescue/Safety readiness data; it must act on teammate reports.",
    meterBabysittingVsHumanCoordination: leaked ? "leak detected" : "distributed status and callout timing determined the close attempt"
  });
}

test("G1 clean success", () => {
  const ctx = start("CLN234"); reachFinal(ctx);
  const outcome = coordinatedClose(ctx);
  assert.equal(outcome.variant, "COORDINATED_CLOSE");
  assert.equal(outcome.metrics.gateDamage, 0);
  assert.equal(outcome.details.gate.condition, "intact");
  record(ctx, "G1", "clean success", { operations: "Rebutter", rescue: "Opportunity Finder", safety: "Outsider" }, outcome, ["林芮固定了", "支撐窗口開了，現在關"], "Rescue secure plus Safety pressure window", false, "no recovery needed");
});

test("G2 one premature pull recovery", () => {
  const ctx = start("ONE234"); reachFinal(ctx);
  const outcome = coordinatedClose(ctx, { prematurePulls: 1 });
  assert.equal(outcome.variant, "COORDINATED_CLOSE");
  assert.equal(outcome.metrics.gateDamage, 24);
  assert.equal(outcome.recovery.reboundCount, 1);
  assert.equal(outcome.details.gate.condition, "damaged");
  record(ctx, "G2", "one premature pull recovery", { operations: "Rebutter", rescue: "Opportunity Finder", safety: "Outsider" }, outcome, ["先停，林芮還沒回報", "支撐窗口現在開"], "first premature close rebound", false, "one rebound, then a coordinated retry completed the close");
});

test("G3 two premature pulls recovery", () => {
  const ctx = start("TWO234"); reachFinal(ctx);
  const outcome = coordinatedClose(ctx, { prematurePulls: 2 });
  assert.equal(outcome.variant, "COORDINATED_CLOSE");
  assert.equal(outcome.metrics.gateDamage, 48);
  assert.equal(outcome.recovery.reboundCount, 2);
  assert.equal(outcome.details.gate.condition, "severely_damaged");
  record(ctx, "G3", "two premature pulls recovery", { operations: "Opportunity Finder", rescue: "Rebutter", safety: "Outsider" }, outcome, ["先等第二次回報", "現在才是關閘窗口"], "two bounded close rebounds", false, "two rebounds, then a coordinated retry completed the close");
});

test("G4 delayed callout incomplete close", () => {
  const ctx = start("DLY234"); reachFinal(ctx);
  command(ctx, "rescue", "SECURE_TROLLEY");
  command(ctx, "operations", "CLOSE_START");
  advance(ctx, 2);
  assert.equal(ctx.state.metrics.prematureCloseCount, 1);
  advance(ctx, Math.ceil((ctx.state.deadlineAt - ctx.state.metrics.lastAt) / 1000));
  const outcome = ctx.state.outcome;
  assert.notEqual(outcome.variant, "COORDINATED_CLOSE");
  assert.equal(outcome.gateClosed, false);
  assert.equal(outcome.details.gate.state, "open");
  record(ctx, "G4", "delayed callout incomplete close", { operations: "Outsider", rescue: "Opportunity Finder", safety: "Rebutter" }, outcome, ["林芮固定了，但沒有及時喊出", "壓力窗口已經過了"], "Rescue secure and Safety window", false, "one rebound was not followed by a complete close");
});

test("G5 Gao retreat strategy", () => {
  const ctx = start("RET234"); reachFinal(ctx);
  command(ctx, "rescue", "SECURE_TROLLEY");
  command(ctx, "safety", "RETREAT_GAO");
  command(ctx, "operations", "CLOSE_START");
  advance(ctx, 45);
  const outcome = ctx.state.outcome;
  assert.equal(outcome.gateClosed, false);
  assert.equal(outcome.linSafe, true);
  assert.equal(outcome.gaoSafe, true);
  assert.equal(outcome.details.gaoCheng.status, "已撤出污染暴露");
  record(ctx, "G5", "Gao retreat strategy", { operations: "Opportunity Finder", rescue: "Outsider", safety: "Rebutter" }, outcome, ["高承先撤出", "現場支撐已放開"], "Gao retreat tradeoff", false, "the safe retreat preserved Gao but left the gate open");
});

test("G6 first-time intuitive coordinated run", () => {
  const ctx = start("ABH234"); reachFinal(ctx);
  const outcome = coordinatedClose(ctx);
  assert.equal(outcome.variant, "COORDINATED_CLOSE");
  record(ctx, "G6", "first-time intuitive coordinated", { operations: "Outsider", rescue: "Opportunity Finder", safety: "Rebutter" }, outcome, ["我固定好了", "高承說窗口到了", "收到，拉閘"], "owner-local character and instrument feedback", false, "plain role-local labels supported the first attempt");
});

test.after(async () => {
  assert.equal(evidence.games.length, 6);
  assert.deepEqual(evidence.games.map((game) => game.id), ["G1", "G2", "G3", "G4", "G5", "G6"]);
  assert.equal(evidence.games.some((game) => game.sameFactLeakedByAnotherPhone), false);
  assert.equal(evidence.games.every((game) => game.contributions.length === 3), true);
  if (process.env.MOMEY_A9R4_COUNCIL_EVIDENCE_PATH) await writeFile(process.env.MOMEY_A9R4_COUNCIL_EVIDENCE_PATH, JSON.stringify(evidence, null, 2) + "\n", "utf8");
});
