import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as a9r3 from "../../worker-a9r3/src/engine.js";
import { ROLE_IDS, PRESSURE_WAVE_VARIANTS, materialize, createRoom } from "../src/engine.js";

const T0 = 1_801_400_000_000;

function readyOutcome({ gateDamage, rebounds }) {
  const state = createRoom({ roomCode: `OUT${gateDamage}4`, now: T0 });
  state.phase = "FINAL";
  state.phaseStartedAt = T0 - state.pressureWave.reliefStartMs - 2_000;
  state.deadlineAt = T0 + 45_000;
  Object.assign(state.metrics, {
    lastAt: T0,
    powerMode: "gate",
    backupPower: 72,
    trolleyPosition: 88,
    rescueCheckpoint: 3,
    linBoundary: true,
    trolleySecured: true,
    gatePressure: 55,
    gateDamage,
    braceActive: true,
    braceStamina: 100,
    braceStable: true,
    gaoExposure: 20,
    gaoRetreated: false,
    closeActive: true,
    closeProgress: 99,
    closeAttempts: rebounds + 1,
    prematureCloseCount: rebounds,
  });
  return materialize(state, T0 + 1_000).outcome;
}

test("A9R4 preserves the A9R3 pressure-wave family exactly", () => {
  assert.deepEqual(PRESSURE_WAVE_VARIANTS, a9r3.PRESSURE_WAVE_VARIANTS);
});

test("clean, one-rebound, and two-rebound successful closures are player-visible distinct", () => {
  const outcomes = [
    readyOutcome({ gateDamage: 0, rebounds: 0 }),
    readyOutcome({ gateDamage: 24, rebounds: 1 }),
    readyOutcome({ gateDamage: 48, rebounds: 2 }),
  ];
  assert.deepEqual(outcomes.map((outcome) => outcome.variant), ["COORDINATED_CLOSE", "COORDINATED_CLOSE", "COORDINATED_CLOSE"]);
  assert.deepEqual(outcomes.map((outcome) => outcome.metrics.gateDamage), [0, 24, 48]);
  assert.deepEqual(outcomes.map((outcome) => outcome.details.gate.condition), ["intact", "damaged", "severely_damaged"]);
  assert.deepEqual(outcomes.map((outcome) => outcome.details.gate.status), ["已關閉", "已關閉", "已關閉"]);
  assert.deepEqual(outcomes.map((outcome) => outcome.details.recovery.reboundCount), [0, 1, 2]);
  assert.equal(new Set(outcomes.map((outcome) => outcome.recap.join("|"))).size, 3);
  assert.equal(new Set(outcomes.map((outcome) => outcome.details.recovery.summary)).size, 3);
  assert.equal(new Set(outcomes.map((outcome) => outcome.details.contributions[0].line)).size, 3);
  assert.equal(outcomes.every((outcome) => outcome.details.contributions.length === 3), true);
  assert.deepEqual(outcomes[0].details.contributions.map((row) => row.roleId), ROLE_IDS);
});

test("outcome details contain exactly one truthful contribution for each role", () => {
  const outcome = readyOutcome({ gateDamage: 24, rebounds: 1 });
  const contributions = outcome.details.contributions;
  assert.deepEqual(contributions.map((row) => row.roleId), ["operations", "rescue", "safety"]);
  assert.deepEqual(contributions.map((row) => row.sourceLabel), ["電力控制台", "西側救援回報", "閘門現場"]);
  assert.equal(new Set(contributions.map((row) => row.roleId)).size, 3);
  assert.match(contributions[0].line, /關閘/);
  assert.match(contributions[1].line, /林芮|救援車/);
  assert.match(contributions[2].line, /高承|支撐/);
  assert.equal(contributions.every((row) => row.line.trim().length > 0), true);
});

test("minor incidental wear is not overdramatised as a damaged closure", () => {
  const outcome = readyOutcome({ gateDamage: 8, rebounds: 0 });
  assert.equal(outcome.details.gate.condition, "intact");
  assert.equal(outcome.details.gate.conditionLabel, "完整");
});

test("A9R4 outcome UI uses in-world sources and does not restore meta readiness language", () => {
  const app = fs.readFileSync(new URL("../../playable-a9r4/assets/app.js", import.meta.url), "utf8");
  assert.doesNotMatch(app, /只有本席先看到/);
  assert.match(app, /電力控制台/);
  assert.match(app, /西側救援回報/);
  assert.match(app, /閘門現場/);
  assert.match(app, /收到西側救援與閘門現場回報後拉閘/);
  assert.match(app, /data-outcome-card/);
  assert.match(app, /data-contribution/);
  assert.doesNotMatch(app, /safetySupportCoarse|teammateReady|rescueReady|safetyReady/);
});
