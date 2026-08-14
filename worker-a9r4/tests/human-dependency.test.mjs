import test from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import * as a9r2 from "../../worker-a9r2/src/engine.js";
import * as a9r3 from "../../worker-a9r3/src/engine.js";
import * as a9r4 from "../src/engine.js";

const T0 = 1_800_700_000_000;
const ROLES = ["operations", "rescue", "safety"];
const LIVE = new Set(["WINDOW1", "WINDOW2", "FINAL"]);
const DURATION_SECONDS = { WINDOW1: 70, WINDOW2: 60, FINAL: 45 };

function randomSource(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function randomBetween(random, min, max) { return min + (max - min) * random(); }

function createContext(engine, seed) {
  const random = randomSource(seed);
  let state = engine.createRoom({ roomCode: `S${String(seed).padStart(5, "0").slice(-5)}`, now: T0 + seed * 1000 });
  const tokens = {};
  for (const roleId of ROLES) {
    const connected = engine.connectSeat(state, { roleId, newToken: `${roleId}-${seed}`, connectionId: `${roleId}-device`, now: state.metrics.lastAt });
    assert.equal(connected.ok, true);
    state = connected.state;
    tokens[roleId] = connected.token;
  }
  const ctx = {
    engine,
    state,
    tokens,
    random,
    nextThinkAt: Object.fromEntries(ROLES.map((role) => [role, state.metrics.lastAt])),
    memory: {
      operations: { closeDelay: randomBetween(random, 3.5, 9), lastPhase: null },
      rescue: { startHeat: randomBetween(random, 54, 70), stopHeat: randomBetween(random, 82, 92), lastPhase: null },
      safety: { pressureStart: randomBetween(random, 42, 58), staminaStart: randomBetween(random, 48, 70), staminaStop: randomBetween(random, 14, 24), finalStart: randomBetween(random, 28, 52), lastPhase: null },
    },
    messages: [],
    facts: {},
    trace: [],
  };
  for (const roleId of ROLES) send(ctx, roleId, "TAKEOVER");
  for (let beat = 1; beat <= 6; beat += 1) send(ctx, ctx.state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: `A9R_BRIEFING_${beat}` });
  for (const roleId of ROLES) send(ctx, roleId, "TRAIN");
  send(ctx, ctx.state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: "A9R_TRAINING_COMPLETE" });
  return ctx;
}

function projection(ctx, roleId) {
  return ctx.engine.projectRoomState(ctx.state, roleId, ctx.state.metrics.lastAt);
}

function send(ctx, roleId, type, extra = {}) {
  const visible = projection(ctx, roleId);
  const result = ctx.engine.applyCommand(ctx.state, {
    type,
    roleId,
    token: ctx.tokens[roleId],
    phase: visible.phase,
    version: visible.version,
    ...extra,
  }, ctx.state.metrics.lastAt + 1);
  if (!result.ok) return false;
  ctx.state = result.state;
  ctx.trace.push({ at: visible.serverNow, phase: visible.phase, roleId, type, ...(extra.mode ? { mode: extra.mode } : {}) });
  return true;
}

function elapsedSeconds(visible) {
  if (!LIVE.has(visible.phase)) return 0;
  return DURATION_SECONDS[visible.phase] - Math.ceil((visible.timeLeftMs || 0) / 1000);
}

function queueCallout(ctx, roleId, fact, value, now) {
  const current = ctx.messages.findLast((row) => row.roleId === roleId && row.fact === fact);
  if (current?.value === value) return;
  const proposed = now + randomBetween(ctx.random, 150, 1250);
  ctx.messages.push({ roleId, fact, value, deliverAt: Math.max(proposed, (current?.deliverAt || 0) + 1) });
}

function deliverCallouts(ctx, now) {
  for (const message of ctx.messages) {
    if (!message.delivered && message.deliverAt <= now) {
      message.delivered = true;
      ctx.facts[message.fact] = message.value;
    }
  }
}

function operationsPolicy(ctx, visible, coordinated) {
  const control = visible.control;
  if (visible.phase === "WINDOW1" || visible.phase === "WINDOW2") {
    let wanted = "balanced";
    if (coordinated && ctx.facts.pressureHigh) wanted = "gate";
    if (coordinated && visible.phase === "WINDOW1" && ctx.facts.window1RescueDone) wanted = "gate";
    if (coordinated && visible.phase === "WINDOW2" && ctx.facts.window2RescueDone) wanted = "gate";
    if (control.powerMode !== wanted) return { type: "SET_POWER", mode: wanted };
  }
  if (visible.phase === "FINAL") {
    if (control.powerMode !== "gate") return { type: "SET_POWER", mode: "gate" };
    const shouldClose = coordinated
      ? Boolean(ctx.facts.finalRescueReady && ctx.facts.finalSafetyReady)
      : elapsedSeconds(visible) >= ctx.memory.operations.closeDelay;
    if (coordinated && control.closeActive && !shouldClose) return { type: "CLOSE_STOP" };
    if (shouldClose && !control.closeActive) return { type: "CLOSE_START" };
  }
  return null;
}

function rescuePolicy(ctx, visible, coordinated) {
  const control = visible.control;
  if (coordinated) {
    if (visible.phase === "WINDOW1") queueCallout(ctx, "rescue", "window1RescueDone", control.checkpointExact >= 2, visible.serverNow);
    if (visible.phase === "WINDOW2") queueCallout(ctx, "rescue", "window2RescueDone", control.linBoundaryExact, visible.serverNow);
    if (visible.phase === "FINAL") queueCallout(ctx, "rescue", "finalRescueReady", control.secured, visible.serverNow);
  }
  if (visible.phase === "WINDOW1" || visible.phase === "WINDOW2") {
    if (control.trolleyMoving && (control.heatExact >= ctx.memory.rescue.stopHeat || !control.railPowered || control.routeLocked)) return { type: "TROLLEY_STOP" };
    if (!control.trolleyMoving && control.railPowered && control.heatExact <= ctx.memory.rescue.startHeat && !control.routeLocked) return { type: "TROLLEY_START" };
  }
  if (visible.phase === "FINAL" && control.linBoundaryExact && !control.secured) return { type: "SECURE_TROLLEY" };
  return null;
}

function safetyPolicy(ctx, visible, coordinated) {
  const control = visible.control;
  if (coordinated) {
    if (visible.phase === "WINDOW1" || visible.phase === "WINDOW2") {
      queueCallout(ctx, "safety", "pressureHigh", control.pressureExact >= 68, visible.serverNow);
    }
    if (visible.phase === "FINAL") queueCallout(ctx, "safety", "finalSafetyReady", control.braceStableExact, visible.serverNow);
  }
  if (visible.phase === "WINDOW2" && control.shieldAvailable) return { type: "DEPLOY_SHIELD" };
  if (visible.phase === "WINDOW1" || visible.phase === "WINDOW2") {
    if (control.braceActive && control.braceStaminaExact <= ctx.memory.safety.staminaStop) return { type: "BRACE_STOP" };
    if (!control.braceActive && control.braceStaminaExact >= ctx.memory.safety.staminaStart && control.pressureExact >= ctx.memory.safety.pressureStart) return { type: "BRACE_START" };
  }
  if (visible.phase === "FINAL") {
    if (control.pressureWindowExact === undefined) {
      if (control.braceActive && control.braceStaminaExact <= ctx.memory.safety.staminaStop) return { type: "BRACE_STOP" };
      if (!control.braceActive && control.braceStaminaExact >= ctx.memory.safety.finalStart) return { type: "BRACE_START" };
      return null;
    }
    const windowOpen = control.pressureWindowExact === "現在可關閘";
    if (control.braceActive && (control.braceStaminaExact <= ctx.memory.safety.staminaStop || (!windowOpen && control.pressureExact < 52))) return { type: "BRACE_STOP" };
    if (!control.braceActive && windowOpen && control.braceStaminaExact >= 50) return { type: "BRACE_START" };
    if (!control.braceActive && !windowOpen && control.pressureExact >= 70 && control.braceStaminaExact >= ctx.memory.safety.finalStart) return { type: "BRACE_START" };
  }
  return null;
}

function runPolicy(engine, seed, coordinated) {
  const ctx = createContext(engine, seed);
  for (let tick = 0; tick < 560 && ctx.state.phase !== "OUTCOME"; tick += 1) {
    const now = ctx.state.metrics.lastAt;
    deliverCallouts(ctx, now);
    if (ctx.state.phase === "INTERLUDE") {
      send(ctx, ctx.state.audioMasterRole, "COMPLETE_OPERATOR", { eventId: "A9_WINDOW1_RESULT" });
      continue;
    }
    if (!LIVE.has(ctx.state.phase)) throw new Error(`Unexpected phase ${ctx.state.phase}`);
    for (const roleId of ROLES) {
      if (ctx.state.phase === "OUTCOME") break;
      const currentNow = ctx.state.metrics.lastAt;
      if (currentNow < ctx.nextThinkAt[roleId]) continue;
      const visible = projection(ctx, roleId);
      const action = roleId === "operations" ? operationsPolicy(ctx, visible, coordinated) : roleId === "rescue" ? rescuePolicy(ctx, visible, coordinated) : safetyPolicy(ctx, visible, coordinated);
      if (action) send(ctx, roleId, action.type, action);
      ctx.nextThinkAt[roleId] = ctx.state.metrics.lastAt + randomBetween(ctx.random, 250, 3000);
    }
    ctx.state = engine.materialize(ctx.state, ctx.state.metrics.lastAt + 500);
  }
  assert.equal(ctx.state.phase, "OUTCOME", `seed ${seed} did not finish`);
  return { variant: ctx.state.outcome.variant, trace: ctx.trace, messages: ctx.messages.filter((row) => row.delivered).length };
}

function distribution(engine, coordinated, runs = 200, seedOffset = 0) {
  const outcomes = {};
  let deliveredCallouts = 0;
  const failureSamples = [];
  for (let index = 0; index < runs; index += 1) {
    const result = runPolicy(engine, seedOffset + index + 1, coordinated);
    outcomes[result.variant] = (outcomes[result.variant] || 0) + 1;
    deliveredCallouts += result.messages;
    if (result.variant !== "COORDINATED_CLOSE" && failureSamples.length < 3) failureSamples.push({ seed: seedOffset + index + 1, variant: result.variant, traceTail: result.trace.slice(-18) });
  }
  const successes = outcomes.COORDINATED_CLOSE || 0;
  return { runs, outcomes, successes, successRate: successes / runs, deliveredCallouts, failureSamples };
}

const evidence = { generatedAt: new Date().toISOString(), policyBoundary: "Decisions receive only projectRoomState(role) plus explicit delivered callout facts in coordinated mode." };

test("A9R2 local-only silent counterexample reaches COORDINATED_CLOSE", () => {
  const result = runPolicy(a9r2, 901, false);
  assert.equal(result.variant, "COORDINATED_CLOSE");
  evidence.a9r2Counterexample = { status: "PASS_REPRODUCED", outcome: result.variant };
});

test("200-run A9R3 and A9R4 local-only versus coordinated policy regression", () => {
  evidence.a9r3Silent = distribution(a9r3, false, 200, 2000);
  evidence.a9r3Coordinated = distribution(a9r3, true, 200, 3000);
  evidence.a9r4Silent = distribution(a9r4, false, 200, 2000);
  evidence.a9r4Coordinated = distribution(a9r4, true, 200, 3000);
  evidence.a9r3Delta = evidence.a9r3Coordinated.successRate - evidence.a9r3Silent.successRate;
  evidence.a9r4Delta = evidence.a9r4Coordinated.successRate - evidence.a9r4Silent.successRate;
  assert.equal(evidence.a9r4Silent.successRate, evidence.a9r3Silent.successRate, "A9R4 silent policy must preserve the A9R3 result");
  assert.equal(evidence.a9r4Coordinated.successRate, evidence.a9r3Coordinated.successRate, "A9R4 coordinated policy must preserve the A9R3 result");
  assert.ok(evidence.a9r3Silent.successRate <= 0.55, `A9R3 silent success still too reliable: ${evidence.a9r3Silent.successRate}`);
  assert.ok(evidence.a9r3Delta >= 0.25, `A9R3 coordinated delta too small: ${evidence.a9r3Delta}`);
  assert.ok(evidence.a9r4Delta >= 0.25, `A9R4 coordinated delta too small: ${evidence.a9r4Delta}`);
});

test.after(async () => {
  if (process.env.MOMEY_A9R4_POLICY_EVIDENCE) await writeFile(process.env.MOMEY_A9R4_POLICY_EVIDENCE, JSON.stringify(evidence, null, 2) + "\n", "utf8");
});
