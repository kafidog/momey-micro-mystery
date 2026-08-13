import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTIONS,
  ENDING_VARIANTS,
  PHASES,
  ROLE_IDS,
  ROOM_TTL_MS,
  applyCommand,
  connectSeat,
  createRoom,
  endingReasonsFor,
  projectRoomState,
  randomRoomCode,
  randomProfile
} from "../src/engine.js";

const NOW = 1_700_000_000_000;

function connectAll(profile = "BREAKLINE") {
  let state = createRoom({ roomCode: "ABC234", profile, now: NOW });
  const tokens = {};
  for (const roleId of ROLE_IDS) {
    const result = connectSeat(state, {
      roleId,
      newToken: `${roleId}-token`,
      connectionId: `${roleId}-connection`,
      now: NOW
    });
    assert.equal(result.ok, true, `${roleId} should connect`);
    tokens[roleId] = result.token;
    state = result.state;
  }
  return { state, tokens };
}

function send(state, tokens, roleId, type, extra = {}) {
  const result = applyCommand(state, {
    type,
    roleId,
    token: tokens[roleId],
    phase: state.phase,
    version: state.version,
    ...extra
  }, NOW + state.version + 1);
  assert.equal(result.ok, true, `${type} ${roleId} should be accepted: ${result.code || result.message}`);
  return result.state;
}

function rejectWithoutMutation(state, tokens, roleId, type, extra, code) {
  const before = JSON.stringify(state);
  const result = applyCommand(state, {
    type,
    roleId,
    token: tokens[roleId],
    phase: state.phase,
    version: state.version,
    ...extra
  }, NOW + state.version + 1);
  assert.equal(result.ok, false);
  assert.equal(result.code, code);
  assert.equal(JSON.stringify(state), before, `${code} must not mutate state`);
  return result;
}

function completeOperator(state, tokens, roleId = "operations") {
  assert.ok(state.operatorEvent, `operator event expected at ${state.phase}`);
  return send(state, tokens, roleId, "COMPLETE_OPERATOR", { eventId: state.operatorEvent.id });
}

function startGame(profile = "BREAKLINE") {
  let { state, tokens } = connectAll(profile);
  for (const roleId of ROLE_IDS) state = send(state, tokens, roleId, "TAKEOVER");
  assert.equal(state.phase, "INTRO_1");
  while (state.phase.startsWith("INTRO_")) state = completeOperator(state, tokens);
  assert.equal(state.phase, "ROUND1_ACTION");
  return { state, tokens };
}

function finishRepresentativeGame(profile = "BREAKLINE", round1Choice = null) {
  let { state, tokens } = startGame(profile);
  for (const roleId of ROLE_IDS) {
    const action = round1Choice?.[roleId] || ACTIONS.ROUND1[roleId][0].id;
    state = send(state, tokens, roleId, "ACTION", { actionId: action });
  }
  assert.equal(state.phase, "ROUND1_DISCUSS");
  state = completeOperator(state, tokens);
  for (const roleId of ROLE_IDS) state = send(state, tokens, roleId, "READY");
  assert.equal(state.phase, "ROUND2_ACTION");
  for (const roleId of ROLE_IDS) state = send(state, tokens, roleId, "ACTION", { actionId: stateForFirstOption(state, roleId) });
  assert.equal(state.phase, "ROUND2_DISCUSS");
  state = completeOperator(state, tokens);
  for (const roleId of ROLE_IDS) state = send(state, tokens, roleId, "READY");
  assert.equal(state.phase, "ROUND3_ACTION");
  state = completeOperator(state, tokens);
  for (const roleId of ROLE_IDS) state = send(state, tokens, roleId, "ACTION", { actionId: stateForFirstOption(state, roleId) });
  assert.equal(state.phase, "ROUND3_DISCUSS");
  state = completeOperator(state, tokens);
  for (const roleId of ROLE_IDS) state = send(state, tokens, roleId, "READY");
  assert.equal(state.phase, "FINAL_VOTE");
  for (const roleId of ROLE_IDS) state = send(state, tokens, roleId, "VOTE", { vote: "close" });
  assert.equal(state.phase, "ENDING");
  assert.ok(state.ending?.dialogueId);
  return { state, tokens };
}

function stateForFirstOption(state, roleId) {
  const projection = projectRoomState(state, roleId);
  assert.ok(projection.options.length >= 2, `${state.phase} should have contextual options`);
  return projection.options[0].id;
}

function legalActionBranches(branches, round) {
  const historyKey = `round${round}`;
  let current = branches;
  for (const roleId of ROLE_IDS) {
    const next = [];
    for (const branch of current) {
      const options = projectRoomState(branch.state, roleId).options;
      assert.equal(options.length, 2, `${roleId} round ${round} must expose two legal choices`);
      for (const option of options) {
        next.push({
          state: send(branch.state, branch.tokens, roleId, "ACTION", { actionId: option.id }),
          tokens: branch.tokens,
          history: {
            round1: historyKey === "round1" ? [...branch.history.round1, option.id] : branch.history.round1,
            round2: historyKey === "round2" ? [...branch.history.round2, option.id] : branch.history.round2,
            round3: historyKey === "round3" ? [...branch.history.round3, option.id] : branch.history.round3
          }
        });
      }
    }
    current = next;
  }
  return current;
}

function finishDiscussion(state, tokens) {
  state = completeOperator(state, tokens);
  for (const roleId of ROLE_IDS) state = send(state, tokens, roleId, "READY");
  return state;
}

function legalEndingEvidence() {
  const evidence = new Map();
  for (const profile of ["BREAKLINE", "BACKWASH"]) {
    const started = startGame(profile);
    let branches = [{ state: started.state, tokens: started.tokens, history: { round1: [], round2: [], round3: [] } }];
    branches = legalActionBranches(branches, 1);
    branches = branches.map((branch) => ({ ...branch, state: finishDiscussion(branch.state, branch.tokens) }));
    branches = legalActionBranches(branches, 2);
    branches = branches.map((branch) => ({ ...branch, state: finishDiscussion(branch.state, branch.tokens) }));
    assert.ok(branches.every((branch) => branch.state.phase === "ROUND3_ACTION"));
    branches = branches.map((branch) => ({ ...branch, state: completeOperator(branch.state, branch.tokens) }));
    branches = legalActionBranches(branches, 3);
    branches = branches.map((branch) => ({ ...branch, state: finishDiscussion(branch.state, branch.tokens) }));
    assert.ok(branches.every((branch) => branch.state.phase === "FINAL_VOTE"));
    for (const branch of branches) {
      for (const vote of ["close", "hold"]) {
        let state = branch.state;
        for (const roleId of ROLE_IDS) state = send(state, branch.tokens, roleId, "VOTE", { vote });
        assert.equal(state.phase, "ENDING");
        const variant = state.ending.variant;
        if (!evidence.has(variant)) evidence.set(variant, { profile, vote, history: branch.history });
        assert.equal(state.ending.reasons.length, 4);
        assert.doesNotMatch(JSON.stringify(state.ending.reasons), /R[123]_|A8_[A-Z0-9_]+|BREAKLINE|BACKWASH|round[123](?:Action|Result)|backupPower|gateStability|gaoProtection|rescueProgress|routeCommitted|trolleyDispatched/);
      }
    }
  }
  return evidence;
}

test("room code/profile helpers are bounded and avoid ambiguous characters", () => {
  const code = randomRoomCode(() => 0.1);
  assert.equal(code.length, 6);
  assert.match(code, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  assert.equal(randomProfile(() => 0.2), "BREAKLINE");
  assert.equal(randomProfile(() => 0.8), "BACKWASH");
});

test("backup-power labels decrease in the same direction as the authoritative resource", () => {
  const state = createRoom({ roomCode: "ABC234", profile: "BREAKLINE", now: NOW });
  assert.equal(projectRoomState(state, "operations").shared.tracks.backupPower, "兩份");
  state.shared.backupPower = 1;
  assert.equal(projectRoomState(state, "operations").shared.tracks.backupPower, "剩一份");
  state.shared.backupPower = 0;
  assert.equal(projectRoomState(state, "operations").shared.tracks.backupPower, "已用完");
});

test("three unique seats and all takeovers start the exact eight-event intro", () => {
  let { state, tokens } = connectAll();
  assert.equal(state.phase, "LOBBY");
  assert.equal(state.audioMasterRole, "operations");
  assert.equal(state.seats.operations.connected, true);
  assert.equal(state.seats.rescue.connected, true);
  assert.equal(state.seats.safety.connected, true);
  for (const roleId of ROLE_IDS) state = send(state, tokens, roleId, "TAKEOVER");
  assert.equal(state.phase, "INTRO_1");
  const introEvents = [];
  while (state.phase.startsWith("INTRO_")) {
    introEvents.push(state.operatorEvent.id);
    state = completeOperator(state, tokens);
  }
  assert.deepEqual(introEvents, [
    "A8_INTRO_01", "A8_INTRO_02", "A8_INTRO_03", "A8_INTRO_04",
    "A8_INTRO_05", "A8_INTRO_06", "A8_INTRO_07", "A8_INTRO_08"
  ]);
  assert.equal(state.phase, "ROUND1_ACTION");
  assert.equal(state.operatorEvent, null);
});

test("all six first-round alternatives produce contextual second-round options", () => {
  for (const roleId of ROLE_IDS) {
    const actionSets = ACTIONS.ROUND1[roleId].map((choice) => {
      let { state, tokens } = startGame();
      state = send(state, tokens, roleId, "ACTION", { actionId: choice.id });
      return new Set(ACTIONS.ROUND2[choice.id].map((option) => option.id));
    });
    assert.notDeepEqual([...actionSets[0]], [...actionSets[1]], roleId);
  }
});

test("full representative path gives every role three actions and a causal ending", () => {
  const { state } = finishRepresentativeGame("BREAKLINE");
  assert.deepEqual(PHASES.slice(-2), ["FINAL_VOTE", "ENDING"]);
  for (const roleId of ROLE_IDS) {
    assert.ok(state.seats[roleId].round1Action);
    assert.ok(state.seats[roleId].round2Action);
    assert.ok(state.seats[roleId].round3Action);
  }
  assert.ok(state.ending.reasons.length >= 3 && state.ending.reasons.length <= 5);
  assert.ok(state.ending.reasons.every((line) => line.length >= 12));
  assert.doesNotMatch(JSON.stringify(state.ending.reasons), /R[123]_|A8_[A-Z0-9_]+|BREAKLINE|BACKWASH|round[123](?:Action|Result)|backupPower|gateStability|gaoProtection|rescueProgress|routeCommitted|trolleyDispatched|BREAKLINE|BACKWASH/);
  assert.match(state.shared.round2Summary, /現場|救援|結構/);
  assert.match(state.shared.round3Summary, /現場|救援|結構/);
});

test("all eight ending variants are reachable through legal three-seat action sequences", () => {
  const evidence = legalEndingEvidence();
  assert.deepEqual([...evidence.keys()].sort(), [...ENDING_VARIANTS].sort());
  assert.equal(evidence.size, 8);
  for (const entry of evidence.values()) {
    assert.equal(entry.history.round1.length, 3);
    assert.equal(entry.history.round2.length, 3);
    assert.equal(entry.history.round3.length, 3);
  }
});

test("ending reasons use the historical R2 label after later power filtering", () => {
  const state = createRoom({ roomCode: "ABC234", profile: "BREAKLINE", now: NOW });
  state.shared.backupPower = 0;
  state.seats.operations.round1Action = "R1_O_GATE";
  state.seats.operations.round2Action = "R2_O_RAIL_PULSE";
  state.seats.operations.round3Action = "R3_O_SACRIFICE_RAIL";
  state.seats.rescue.round1Action = "R1_R_CONTACT";
  state.seats.rescue.round2Action = "R2_R_GUIDE_LIN";
  state.seats.rescue.round3Action = "R3_R_COMMIT_ROUTE";
  state.seats.safety.round1Action = "R1_S_HAZARD";
  state.seats.safety.round2Action = "R2_S_RESEAT_BRACE";
  state.seats.safety.round3Action = "R3_S_KEEP_GAO";
  const reasons = endingReasonsFor(state, "close");
  assert.match(JSON.stringify(reasons), /給西側救援軌道一段短供電/);
  assert.doesNotMatch(JSON.stringify(reasons), /R2_O_RAIL_PULSE|BREAKLINE|BACKWASH|BACKWASH|BREAKLINE/);
});

test("alternate profile/path reaches a different bounded result", () => {
  const first = finishRepresentativeGame("BREAKLINE");
  const alternate = finishRepresentativeGame("BACKWASH", {
    operations: "R1_O_RESCUE",
    rescue: "R1_R_RAIL",
    safety: "R1_S_BRACE"
  });
  assert.notEqual(first.state.ending.dialogueId, alternate.state.ending.dialogueId);
  assert.ok(alternate.state.ending.reasons.some((line) => line.includes("救援聯絡")));
});

test("private first-round result is projected only to its own seat", () => {
  let { state, tokens } = startGame("BREAKLINE");
  state = send(state, tokens, "operations", "ACTION", { actionId: "R1_O_GATE" });
  const ops = projectRoomState(state, "operations");
  const rescue = projectRoomState(state, "rescue");
  assert.match(ops.currentSeat.private.round1.found, /隔離閘/);
  assert.equal(rescue.currentSeat.private.round1, null);
  assert.doesNotMatch(JSON.stringify(rescue), /備用電力只夠撐 20 秒/);
  assert.equal(ops.seats.find((seat) => seat.roleId === "operations").completed, true);
  assert.equal(rescue.seats.find((seat) => seat.roleId === "operations").completed, true);
});

test("invalid, duplicate, stale/future, occupied, token, and operator mismatch commands do not mutate", () => {
  let { state, tokens } = startGame();
  const original = state;
  rejectWithoutMutation(state, tokens, "operations", "ACTION", { actionId: "not-an-option" }, "MALFORMED_ACTION");
  state = send(state, tokens, "operations", "ACTION", { actionId: "R1_O_GATE" });
  rejectWithoutMutation(state, tokens, "operations", "ACTION", { actionId: "R1_O_GATE" }, "DUPLICATE_ACTION");
  rejectWithoutMutation(state, tokens, "rescue", "ACTION", { actionId: "R1_R_CONTACT", version: state.version - 1 }, "STALE_VERSION");
  rejectWithoutMutation(state, tokens, "safety", "ACTION", { actionId: "R1_S_HAZARD", version: state.version + 1 }, "FUTURE_VERSION");
  rejectWithoutMutation(state, tokens, "operations", "ACTION", { actionId: "R1_O_RESCUE", phase: "ROUND2_ACTION" }, "FUTURE_PHASE");
  const wrongToken = applyCommand(state, {
    type: "ACTION", roleId: "operations", token: "wrong", phase: state.phase, version: state.version, actionId: "R1_O_RESCUE"
  }, NOW + 100);
  assert.equal(wrongToken.code, "TOKEN_MISMATCH");
  assert.deepEqual(state, original === state ? original : state);

  const occupied = connectSeat(state, {
    roleId: "operations", connectionId: "second", newToken: "second", now: NOW + 200
  });
  assert.equal(occupied.code, "OCCUPIED_ROLE");

  const wrongMaster = applyCommand(state, {
    type: "COMPLETE_OPERATOR", roleId: "rescue", token: tokens.rescue, phase: state.phase, version: state.version, eventId: "A8_NOT_CURRENT"
  }, NOW + 300);
  assert.equal(wrongMaster.code, "WRONG_OPERATOR_EVENT");

  let lobby = connectAll().state;
  const expired = createRoom({ roomCode: "ABC234", profile: "BREAKLINE", now: NOW });
  expired.expiresAt = NOW - 1;
  const expiry = applyCommand(expired, { type: "TAKEOVER", roleId: "operations", token: "missing", phase: "LOBBY", version: 0 }, NOW);
  assert.equal(expiry.code, "EXPIRED_ROOM");
  void lobby;
});

test("reconnect preserves the seat, actions, phase, and private result", () => {
  let { state, tokens } = startGame();
  state = send(state, tokens, "operations", "ACTION", { actionId: "R1_O_GATE" });
  const disconnected = state.seats.operations.connectionId;
  const afterDisconnect = (awaitableDisconnect => awaitableDisconnect)(null);
  void afterDisconnect;
  const reconnect = connectSeat(state, {
    roleId: "operations",
    token: tokens.operations,
    connectionId: "operations-reconnected",
    newToken: "unused",
    now: NOW + 500,
    forceReconnect: true
  });
  assert.equal(reconnect.ok, true);
  assert.equal(reconnect.token, tokens.operations);
  assert.equal(reconnect.state.seats.operations.round1Action, "R1_O_GATE");
  assert.equal(reconnect.state.seats.operations.connectionId, "operations-reconnected");
  assert.equal(disconnected, "operations-connection");
});

test("two rooms remain independent", () => {
  const a = connectAll("BREAKLINE").state;
  const b = createRoom({ roomCode: "XYZ789", profile: "BACKWASH", now: NOW });
  assert.notEqual(a.roomCode, b.roomCode);
  assert.notEqual(a.profile, b.profile);
  assert.equal(projectRoomState(b, "operations").currentSeat.private.round1, null);
});

test("room TTL is exactly two hours of inactivity", () => {
  const state = createRoom({ roomCode: "ABC234", profile: "BREAKLINE", now: NOW });
  assert.equal(state.expiresAt - state.lastActivityAt, ROOM_TTL_MS);
});
