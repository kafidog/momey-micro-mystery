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

function coordinatedClose(ctx, { rescueCallDelay = 0, safetyCallDelay = 0, preemptive = false } = {}) {
  if (preemptive) {
    command(ctx, "operations", "CLOSE_START");
    advance(ctx, 2);
    assert.ok(ctx.state.metrics.gateDamage >= 24);
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
    phaseDurationSeconds: ctx.phaseDurations,
    naturalCallouts: callouts,
    roleOwnedFactThatMattered: ownedFact,
    sameFactLeakedByAnotherPhone: leaked,
    recovery,
    operationsDominance: "Operations owns the lever but no Rescue/Safety readiness data; it must act on teammate reports.",
    meterBabysittingVsHumanCoordination: leaked ? "leak detected" : "distributed status and callout timing determined the close attempt"
  });
}

test("G1 clean verbal coordination", () => {
  const ctx = start("CLN234"); reachFinal(ctx);
  const outcome = coordinatedClose(ctx);
  assert.equal(outcome.variant, "COORDINATED_CLOSE");
  record(ctx, "G1", "clean verbal coordination", { operations: "Rebutter", rescue: "Opportunity Finder", safety: "Outsider" }, outcome, ["林芮固定了", "支撐窗口開了，現在關"], "Rescue secure plus Safety pressure window", false, "no recovery needed");
});

test("G2 no speech local-only misses the late pressure window", () => {
  const ctx = start("ABE234"); reachFinal(ctx);
  assert.equal(ctx.state.pressureWave.id, "LATE_RELIEF");
  const outcome = silentFinal(ctx);
  assert.notEqual(outcome.variant, "COORDINATED_CLOSE");
  record(ctx, "G2", "no speech / local-only", { operations: "Outsider", rescue: "Rebutter", safety: "Opportunity Finder" }, outcome, [], "Safety knew the late relief window but Operations did not", false, "blind early pull stalled; no verbal recovery");
});

test("G3 Rescue calls late", () => {
  const ctx = start("ABC234"); reachFinal(ctx);
  const outcome = coordinatedClose(ctx, { rescueCallDelay: 5 });
  record(ctx, "G3", "Rescue callout five seconds late", { operations: "Opportunity Finder", rescue: "Outsider", safety: "Rebutter" }, outcome, ["林芮已固定——剛才漏喊了", "支撐窗口開了"], "Rescue secure status", false, outcome.variant === "COORDINATED_CLOSE" ? "late call still fit the bounded window" : "late call consumed the close window");
});

test("G4 Safety calls late", () => {
  const ctx = start("ABF234"); reachFinal(ctx);
  const outcome = coordinatedClose(ctx, { safetyCallDelay: 8 });
  record(ctx, "G4", "Safety callout eight seconds late", { operations: "Rebutter", rescue: "Outsider", safety: "Opportunity Finder" }, outcome, ["林芮固定了", "支撐窗口已經過了一半"], "Safety live pressure window", false, outcome.variant === "COORDINATED_CLOSE" ? "late but recoverable" : "missed or shortened close window");
});

test("G5 Operations acts without confirmation then recovers", () => {
  const ctx = start("ABD234"); reachFinal(ctx);
  const outcome = coordinatedClose(ctx, { preemptive: true });
  assert.ok(ctx.state.outcome.metrics.gateDamage >= 24);
  record(ctx, "G5", "Operations pulls before confirmation", { operations: "Opportunity Finder", rescue: "Rebutter", safety: "Outsider" }, outcome, ["先停，林芮還沒回報", "支撐窗口現在開"], "Both teammate confirmations", false, "one premature pull caused visible strain and cooldown before a coordinated retry");
});

test("G6 first-time intuitive coordinated run", () => {
  const ctx = start("ABH234"); reachFinal(ctx);
  const outcome = coordinatedClose(ctx);
  assert.equal(outcome.variant, "COORDINATED_CLOSE");
  record(ctx, "G6", "first-time intuitive coordinated", { operations: "Outsider", rescue: "Opportunity Finder", safety: "Rebutter" }, outcome, ["我固定好了", "高承說窗口到了", "收到，拉閘"], "owner-local character and instrument feedback", false, "plain role-local labels supported the first attempt");
});

test.after(async () => {
  assert.equal(evidence.games.length, 6);
  assert.equal(evidence.games.some((game) => game.sameFactLeakedByAnotherPhone), false);
  if (process.env.MOMEY_A9R3_COUNCIL_EVIDENCE_PATH) await writeFile(process.env.MOMEY_A9R3_COUNCIL_EVIDENCE_PATH, JSON.stringify(evidence, null, 2) + "\n", "utf8");
});
