/**
 * MOMEY PLAYABLE A8 - one title-specific room engine.
 *
 * This module deliberately has no generic scene, account, analytics, or
 * matchmaking abstraction.  The Worker is the authority; the browser only
 * receives the projection returned by projectRoomState().
 */

export const A8_SCHEMA = "momey-a8-room-v1";
export const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const ROLE_IDS = ["operations", "rescue", "safety"];
export const ROLE_LABELS = Object.freeze({
  operations: "現場調度",
  rescue: "救援聯絡",
  safety: "結構安全"
});

export const PHASES = Object.freeze([
  "LOBBY",
  "INTRO_1",
  "INTRO_2",
  "INTRO_3",
  "INTRO_4",
  "INTRO_5",
  "INTRO_6",
  "INTRO_7",
  "INTRO_8",
  "ROUND1_ACTION",
  "ROUND1_DISCUSS",
  "ROUND2_ACTION",
  "ROUND2_DISCUSS",
  "ROUND3_ACTION",
  "ROUND3_DISCUSS",
  "FINAL_VOTE",
  "ENDING"
]);

export const PROFILES = Object.freeze(["BREAKLINE", "BACKWASH"]);

export const TRACK_LABELS = Object.freeze({
  rescueProgress: ["待命", "路線就緒", "救援車前進", "林芮已上車", "已通過閘門"],
  gateStability: ["臨界", "吃緊", "穩定"],
  gaoProtection: ["暴露", "有遮蔽", "已後撤"],
  backupPower: ["已用完", "剩一份", "兩份"]
});

export const ACTIONS = Object.freeze({
  ROUND1: {
    operations: [
      { id: "R1_O_GATE", label: "查隔離閘的耗電與關閉時間", detail: "確認閘門能撐多久，以及關上後哪條路會失去供電。" },
      { id: "R1_O_RESCUE", label: "查救援車與外側隊伍要多久", detail: "比較西側救援車和外側隊伍，找出還來得及的路。" }
    ],
    rescue: [
      { id: "R1_R_CONTACT", label: "直接呼叫林芮", detail: "先確認她是否能回應，以及她現在能走哪一段。" },
      { id: "R1_R_RAIL", label: "看西側救援軌道", detail: "確認救援車能不能從西側接近林芮。" }
    ],
    safety: [
      { id: "R1_S_HAZARD", label: "看海水與污染多久到高承", detail: "抓住危險抵達高承的位置和剩下的安全窗口。" },
      { id: "R1_S_BRACE", label: "看手動撐桿還能撐多久", detail: "確認高承能不能繼續守住中央隔離閘。" }
    ]
  },
  ROUND2: {
    R1_O_GATE: [
      { id: "R2_O_GATE_RESERVE", label: "把備用電力留給中央隔離閘", detail: "先穩住閘門，救援車暫時不能靠這份電力前進。" },
      { id: "R2_O_RAIL_PULSE", label: "給西側救援軌道一段短供電", detail: "讓救援車先靠近，但會少一份備用電力。" }
    ],
    R1_O_RESCUE: [
      { id: "R2_O_RAIL_POWER", label: "讓救援車先走一段西側救援軌道", detail: "先把救援車送進能回頭的區段，會消耗一份備用電力。" },
      { id: "R2_O_OUTSIDE_ROUTE", label: "把外側救援隊引到替代入口", detail: "保留閘門電力，但救援隊要繞路接手。" }
    ],
    R1_R_CONTACT: [
      { id: "R2_R_GUIDE_LIN", label: "直接引導林芮往高處標記靠近", detail: "讓她先離開污染會先到的低處，救援路線更明確。" },
      { id: "R2_R_HOLD_CONTACT", label: "保持通話，先確認她不走盲段", detail: "不急著移動救援車，換取一條不靠猜的路。" }
    ],
    R1_R_RAIL: [
      { id: "R2_R_DISPATCH_TROLLEY", label: "派救援車低速確認西側軌道", detail: "用一份電力換取軌道的即時確認，救援車會向林芮前進。" },
      { id: "R2_R_HOLD_ROUTE", label: "先保留救援車，維持路線清楚", detail: "不讓救援車進入未確認的區段，但也不增加救援進度。" }
    ],
    R1_S_HAZARD: [
      { id: "R2_S_RAISE_SCREEN", label: "升起防濺屏，替高承擋住第一波", detail: "高承多一層遮蔽，但中央隔離閘的操作空間會變窄。" },
      { id: "R2_S_RESEAT_BRACE", label: "把手動撐桿重新卡回支點", detail: "讓閘門多一點穩定，高承仍要留在東側。" }
    ],
    R1_S_BRACE: [
      { id: "R2_S_RESEAT_BRACE", label: "把手動撐桿重新卡回支點", detail: "用已確認的撐桿餘力換取中央隔離閘穩定。" },
      { id: "R2_S_PULL_GAO_BACK", label: "先把高承拉回有遮蔽的位置", detail: "高承少暴露一段時間，但閘門會少一個現場支點。" }
    ]
  }
});

// Historical action IDs are server-facing only.  This registry is deliberately
// independent from round2OptionsFor()/round3OptionsFor() filtering so an
// ending can always explain a choice with player language after later power
// changes have removed that choice from the currently available list.
const CANONICAL_ACTION_LABELS = Object.freeze({
  R1_O_GATE: "查隔離閘的耗電與關閉時間",
  R1_O_RESCUE: "查救援車與外側隊伍要多久",
  R1_R_CONTACT: "直接呼叫林芮",
  R1_R_RAIL: "看西側救援軌道",
  R1_S_HAZARD: "看海水與污染多久到高承",
  R1_S_BRACE: "看手動撐桿還能撐多久",
  R2_O_GATE_RESERVE: "把備用電力留給中央隔離閘",
  R2_O_RAIL_PULSE: "給西側救援軌道一段短供電",
  R2_O_RAIL_POWER: "讓救援車先走一段西側救援軌道",
  R2_O_OUTSIDE_ROUTE: "把外側救援隊引到替代入口",
  R2_R_GUIDE_LIN: "直接引導林芮往高處標記靠近",
  R2_R_HOLD_CONTACT: "保持通話，先確認她不走盲段",
  R2_R_DISPATCH_TROLLEY: "派救援車低速確認西側軌道",
  R2_R_HOLD_ROUTE: "先保留救援車，維持路線清楚",
  R2_S_RAISE_SCREEN: "升起防濺屏，替高承擋住第一波",
  R2_S_RESEAT_BRACE: "把手動撐桿重新卡回支點",
  R2_S_PULL_GAO_BACK: "先把高承拉回有遮蔽的位置",
  R3_O_POWER_TROLLEY: "把剩餘電力給救援車",
  R3_O_POWER_GATE: "把剩餘電力留給中央隔離閘",
  R3_O_SACRIFICE_RAIL: "犧牲西側救援軌道，換中央隔離閘一段短穩定",
  R3_O_SACRIFICE_GATE: "犧牲中央隔離閘，換西側救援軌道一段短供電",
  R3_R_COMMIT_ROUTE: "現在就承諾已確認的救援路線",
  R3_R_WAIT_CONTACT: "先停下，等林芮回應再走",
  R3_R_COMMIT_ALTERNATE: "改走外側替代入口接手林芮",
  R3_R_STOP_BLIND: "停止盲目前進，保留最後路線",
  R3_S_KEEP_GAO: "讓高承繼續守在機構旁",
  R3_S_ORDER_RETREAT: "現在命令高承撤到遮蔽處",
  R3_S_HOLD_BRACE: "讓高承再撐住一小段",
  R3_S_PULL_TO_COVER: "立刻把高承拉回遮蔽處"
});

export const ENDING_VARIANTS = Object.freeze([
  "BREAKLINE_CLOSE_SAFE",
  "BREAKLINE_CLOSE_EXPOSED",
  "BREAKLINE_HOLD_RETURN",
  "BREAKLINE_HOLD_LOSS",
  "BACKWASH_CLOSE_ROUTE",
  "BACKWASH_CLOSE_DELAY",
  "BACKWASH_HOLD_RETURN",
  "BACKWASH_HOLD_EXPOSED"
]);

const ROUND1_RESULT = Object.freeze({
  BREAKLINE: {
    R1_O_GATE: { found: "中央隔離閘的備用電力只夠撐 20 秒；關上會讓西側救援軌道失去供電。", unknown: "救援車能否在這之前通過。" },
    R1_O_RESCUE: { found: "外側救援隊約 11 分鐘才到，趕不上西側救援軌道的主要窗口。", unknown: "中央隔離閘何時會關上。" },
    R1_R_CONTACT: { found: "林芮四秒前還有回應，她說自己在高處避難台。", unknown: "西側救援軌道此刻是否能通。" },
    R1_R_RAIL: { found: "西側救援軌道目前可通，救援車能走到中央隔離閘的開口。", unknown: "林芮現在是否還能回應。" },
    R1_S_HAZARD: { found: "海水與污染約 72 秒到高承那裡。", unknown: "手動撐桿還能撐多久。" },
    R1_S_BRACE: { found: "手動撐桿撐不過完整的 95 秒。", unknown: "海水與污染何時到高承那裡。" }
  },
  BACKWASH: {
    R1_O_GATE: { found: "中央隔離閘會在 20 秒內關上；低速救援車約需 92 秒通過。", unknown: "外側救援隊多久能到。" },
    R1_O_RESCUE: { found: "外側救援隊約 4 分鐘到；安全空氣約 3 分鐘。", unknown: "中央隔離閘何時會關上。" },
    R1_R_CONTACT: { found: "訊息延遲 41 秒，但林芮還能回應。", unknown: "她當下的位置和西側救援軌道是否都安全。" },
    R1_R_RAIL: { found: "西側救援軌道可低速通行，約 92 秒完成。", unknown: "林芮是否還在高處避難台。" },
    R1_S_HAZARD: { found: "海水與污染約 84 秒到高承；結構壓力在 98 秒後升高。", unknown: "手動撐桿能撐多久。" },
    R1_S_BRACE: { found: "手動撐桿目前還能維持，但呼吸防護密封已受損。", unknown: "海水與污染何時到高承那裡。" }
  }
});

const ROUND1_FLAGS = Object.freeze({
  R1_O_GATE: { gateTimingKnown: true },
  R1_O_RESCUE: { rescueWindowKnown: true },
  R1_R_CONTACT: { contactKnown: true },
  R1_R_RAIL: { routeKnown: true },
  R1_S_HAZARD: { hazardWindowKnown: true },
  R1_S_BRACE: { braceWindowKnown: true }
});

const PHASE_INDEX = new Map(PHASES.map((phase, index) => [phase, index]));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function phaseIsIntro(phase) {
  return /^INTRO_[1-8]$/.test(phase);
}

function phaseRound(phase) {
  if (phase.startsWith("ROUND1")) return 1;
  if (phase.startsWith("ROUND2")) return 2;
  if (phase.startsWith("ROUND3")) return 3;
  return 0;
}

function actionKeyForPhase(phase) {
  if (phase === "ROUND1_ACTION") return "round1Action";
  if (phase === "ROUND2_ACTION") return "round2Action";
  if (phase === "ROUND3_ACTION") return "round3Action";
  return null;
}

function allSeats(state, predicate) {
  return ROLE_IDS.every((roleId) => predicate(state.seats[roleId], roleId));
}

function seatCount(state) {
  return ROLE_IDS.filter((roleId) => Boolean(state.seats[roleId].token)).length;
}

function allClaimed(state) {
  return seatCount(state) === ROLE_IDS.length;
}

function allStarted(state) {
  return allClaimed(state) && allSeats(state, (seat) => seat.started);
}

function allActionsSubmitted(state, key) {
  return allSeats(state, (seat) => Boolean(seat[key]));
}

function allDiscussionReady(state) {
  return allSeats(state, (seat) => seat.ready);
}

function chooseAudioMaster(state) {
  const readyConnected = ROLE_IDS.find((roleId) => state.seats[roleId].connected && state.seats[roleId].started);
  if (readyConnected) return readyConnected;
  return ROLE_IDS.find((roleId) => state.seats[roleId].connected) || null;
}

function touch(state, now) {
  state.lastActivityAt = now;
  state.expiresAt = now + ROOM_TTL_MS;
}

function makeSeat(roleId) {
  return {
    roleId,
    roleLabel: ROLE_LABELS[roleId],
    token: null,
    connected: false,
    connectionId: null,
    started: false,
    ready: false,
    round1Action: null,
    round2Action: null,
    round3Action: null,
    round1Result: null,
    round2Result: null,
    round3Result: null,
    actionLabels: {
      round1: null,
      round2: null,
      round3: null
    },
    vote: null
  };
}

function freshShared() {
  return {
    rescueProgress: 0,
    gateStability: 0,
    gaoProtection: 0,
    backupPower: 2,
    flags: {
      gateTimingKnown: false,
      rescueWindowKnown: false,
      contactKnown: false,
      routeKnown: false,
      hazardWindowKnown: false,
      braceWindowKnown: false,
      trolleyDispatched: false,
      railPulseUsed: false,
      routeCommitted: false,
      alternateRoute: false,
      routeCertainty: false,
      screenRaised: false,
      braceReseated: false,
      gaoRetreated: false,
      railSacrificed: false,
      gateSacrificed: false,
      uncertainty: false
    },
    round1Summary: "",
    round2Summary: "",
    round3Summary: "",
    escalation: "",
    latestUpdate: ""
  };
}

function makeEvent(id) {
  return id ? { id, acknowledged: false } : null;
}

function roleAction(roleId, round, actionId) {
  const options = round === 1 ? ACTIONS.ROUND1[roleId] : null;
  return options ? options.find((option) => option.id === actionId) || null : null;
}

function round2OptionsFor(state, roleId) {
  const r1Action = state.seats[roleId].round1Action;
  return clone(ACTIONS.ROUND2[r1Action] || []).filter((option) => {
    if (option.id === "R2_O_RAIL_PULSE" && state.shared.backupPower <= 0) return false;
    if (option.id === "R2_O_RAIL_POWER" && state.shared.backupPower <= 0) return false;
    if (option.id === "R2_R_DISPATCH_TROLLEY" && state.shared.backupPower <= 0) return false;
    return true;
  });
}

function round3OptionsFor(state, roleId) {
  if (roleId === "operations") {
    if (state.shared.backupPower === 0) {
      return [
        { id: "R3_O_SACRIFICE_RAIL", label: "犧牲西側救援軌道，換中央隔離閘一段短穩定", detail: "救援路線會變得更不確定，但閘門能再撐一小段。" },
        { id: "R3_O_SACRIFICE_GATE", label: "犧牲中央隔離閘，換西側救援軌道一段短供電", detail: "救援車可以前進，但控制室與閘門的安全會下降。" }
      ];
    }
    return [
      { id: "R3_O_POWER_TROLLEY", label: "把剩餘電力給救援車", detail: "讓已確認的救援路線再前進一段。" },
      { id: "R3_O_POWER_GATE", label: "把剩餘電力留給中央隔離閘", detail: "先把閘門撐住，救援車要等待最後決定。" }
    ];
  }
  if (roleId === "rescue") {
    if (state.shared.flags.routeCommitted || state.shared.flags.trolleyDispatched || state.shared.rescueProgress >= 2) {
      return [
        { id: "R3_R_COMMIT_ROUTE", label: "現在就承諾已確認的救援路線", detail: "讓救援車沿已查明的路線前進，不再保留回頭時間。" },
        { id: "R3_R_WAIT_CONTACT", label: "先停下，等林芮回應再走", detail: "避免盲目前進，但林芮會多留在現場一段時間。" }
      ];
    }
    return [
      { id: "R3_R_COMMIT_ALTERNATE", label: "改走外側替代入口接手林芮", detail: "繞過未確認的西側段落，救援會較慢但不靠猜。" },
      { id: "R3_R_STOP_BLIND", label: "停止盲目前進，保留最後路線", detail: "先不派車，讓最後決定保留更多選擇。" }
    ];
  }
  if (state.shared.flags.screenRaised || state.shared.flags.braceReseated || state.shared.gaoProtection >= 1) {
    return [
      { id: "R3_S_KEEP_GAO", label: "讓高承繼續守在機構旁", detail: "閘門多一點穩定，但高承還要承受東側逼近的危險。" },
      { id: "R3_S_ORDER_RETREAT", label: "現在命令高承撤到遮蔽處", detail: "高承先離開危險，中央隔離閘會少一個現場支點。" }
    ];
  }
  return [
    { id: "R3_S_HOLD_BRACE", label: "讓高承再撐住一小段", detail: "閘門暫時不動，但高承的暴露會增加。" },
    { id: "R3_S_PULL_TO_COVER", label: "立刻把高承拉回遮蔽處", detail: "高承先退開，閘門穩定會少一點。" }
  ];
}

function resultFor(profile, actionId) {
  const result = ROUND1_RESULT[profile]?.[actionId];
  return result ? clone(result) : null;
}

function canonicalActionLabel(actionId) {
  return CANONICAL_ACTION_LABELS[actionId] || "這個現場做法";
}

function trackText(shared) {
  return `救援進度：${TRACK_LABELS.rescueProgress[shared.rescueProgress]}；中央隔離閘：${TRACK_LABELS.gateStability[shared.gateStability]}；高承防護：${TRACK_LABELS.gaoProtection[shared.gaoProtection]}；備用電力：${TRACK_LABELS.backupPower[shared.backupPower]}`;
}

function updateTrack(shared, key, delta) {
  const limits = {
    rescueProgress: [0, 4],
    gateStability: [0, 2],
    gaoProtection: [0, 2],
    backupPower: [0, 2]
  };
  const [min, max] = limits[key];
  shared[key] = clamp(shared[key] + delta, min, max);
}

function applyRound1Facts(state) {
  for (const roleId of ROLE_IDS) {
    const action = state.seats[roleId].round1Action;
    const flags = ROUND1_FLAGS[action] || {};
    Object.assign(state.shared.flags, flags);
  }
}

function resolveRound2(state) {
  applyRound1Facts(state);
  const notes = [];
  for (const roleId of ROLE_IDS) {
    const action = state.seats[roleId].round2Action;
    switch (action) {
      case "R2_O_GATE_RESERVE":
        updateTrack(state.shared, "backupPower", -1);
        updateTrack(state.shared, "gateStability", 1);
        notes.push("現場調度把電力留給中央隔離閘，閘門穩定下來，但救援車仍在待命");
        break;
      case "R2_O_RAIL_PULSE":
        updateTrack(state.shared, "backupPower", -1);
        updateTrack(state.shared, "rescueProgress", 1);
        state.shared.flags.railPulseUsed = true;
        notes.push("現場調度給西側救援軌道短供電，救援車靠近了一段，但備用電力少一份");
        break;
      case "R2_O_RAIL_POWER":
        updateTrack(state.shared, "backupPower", -1);
        updateTrack(state.shared, "rescueProgress", 1);
        state.shared.flags.routeCommitted = true;
        notes.push("現場調度讓救援車先走一段，救援進度前進，但備用電力少一份");
        break;
      case "R2_O_OUTSIDE_ROUTE":
        state.shared.flags.alternateRoute = true;
        updateTrack(state.shared, "rescueProgress", 1);
        notes.push("現場調度把外側隊伍引到替代入口，保留閘門電力但救援改走繞路");
        break;
      case "R2_R_GUIDE_LIN":
        state.shared.flags.contactKnown = true;
        state.shared.flags.routeCommitted = true;
        updateTrack(state.shared, "rescueProgress", 1);
        notes.push("救援聯絡引導林芮往高處標記靠近，救援路線更明確");
        break;
      case "R2_R_HOLD_CONTACT":
        state.shared.flags.contactKnown = true;
        state.shared.flags.routeCertainty = true;
        notes.push("救援聯絡保持通話，換到一條不靠猜的路，但救援車還沒前進");
        break;
      case "R2_R_DISPATCH_TROLLEY":
        updateTrack(state.shared, "backupPower", -1);
        updateTrack(state.shared, "rescueProgress", 2);
        state.shared.flags.trolleyDispatched = true;
        state.shared.flags.routeCommitted = true;
        notes.push("救援聯絡派救援車低速確認軌道，車已向林芮前進，但消耗一份備用電力");
        break;
      case "R2_R_HOLD_ROUTE":
        state.shared.flags.routeCertainty = true;
        notes.push("救援聯絡先保留救援車，路線比較清楚，但救援進度沒有增加");
        break;
      case "R2_S_RAISE_SCREEN":
        state.shared.flags.screenRaised = true;
        updateTrack(state.shared, "gaoProtection", 1);
        updateTrack(state.shared, "gateStability", -1);
        notes.push("結構安全升起防濺屏，高承多一層遮蔽，但閘門操作空間變窄");
        break;
      case "R2_S_RESEAT_BRACE":
        state.shared.flags.braceReseated = true;
        updateTrack(state.shared, "gateStability", 1);
        updateTrack(state.shared, "gaoProtection", 1);
        notes.push("結構安全把手動撐桿卡回支點，閘門穩定多一點，高承仍在東側");
        break;
      case "R2_S_PULL_GAO_BACK":
        state.shared.flags.gaoRetreated = true;
        updateTrack(state.shared, "gaoProtection", 2);
        updateTrack(state.shared, "gateStability", -1);
        notes.push("結構安全先把高承拉回遮蔽處，高承少暴露一段，但閘門少一個現場支點");
        break;
      default:
        break;
    }
  }
  state.shared.round2Summary = notes.join("；") || "三個做法都完成了，現場沒有多出可用的餘裕。";
  state.shared.latestUpdate = state.shared.round2Summary;
  state.shared.escalation = state.profile === "BREAKLINE"
    ? "中央隔離閘的壓力突然往上跳；再等一段時間，西側救援軌道和高承的位置只能保住一邊。"
    : "東側海水已經漫過第一個低點；救援車可以前進，但每一個轉彎都會放大時間和防護的代價。";
}

function resolveRound3(state) {
  const notes = [];
  for (const roleId of ROLE_IDS) {
    const action = state.seats[roleId].round3Action;
    switch (action) {
      case "R3_O_POWER_TROLLEY":
        updateTrack(state.shared, "backupPower", -1);
        updateTrack(state.shared, "rescueProgress", 1);
        state.shared.flags.routeCommitted = true;
        notes.push("現場調度把剩餘電力給救援車，已確認的路線再前進一段");
        break;
      case "R3_O_POWER_GATE":
        updateTrack(state.shared, "backupPower", -1);
        updateTrack(state.shared, "gateStability", 1);
        notes.push("現場調度把剩餘電力留給中央隔離閘，閘門先穩住，救援車等待最後決定");
        break;
      case "R3_O_SACRIFICE_RAIL":
        state.shared.flags.railSacrificed = true;
        state.shared.flags.uncertainty = true;
        updateTrack(state.shared, "gateStability", 1);
        notes.push("現場調度犧牲西側救援軌道，換到中央隔離閘一段短穩定");
        break;
      case "R3_O_SACRIFICE_GATE":
        state.shared.flags.gateSacrificed = true;
        updateTrack(state.shared, "gateStability", -1);
        updateTrack(state.shared, "rescueProgress", 1);
        notes.push("現場調度犧牲中央隔離閘，換到西側救援軌道一段短供電");
        break;
      case "R3_R_COMMIT_ROUTE":
        updateTrack(state.shared, "rescueProgress", 1);
        state.shared.flags.routeCommitted = true;
        notes.push("救援聯絡承諾已確認的救援路線，救援車不再保留回頭時間");
        break;
      case "R3_R_WAIT_CONTACT":
        state.shared.flags.uncertainty = true;
        notes.push("救援聯絡先停下等林芮回應，避免盲目前進，但她會多留在現場一段時間");
        break;
      case "R3_R_COMMIT_ALTERNATE":
        state.shared.flags.alternateRoute = true;
        updateTrack(state.shared, "rescueProgress", 1);
        notes.push("救援聯絡改走外側替代入口接手林芮，較慢但不靠猜");
        break;
      case "R3_R_STOP_BLIND":
        state.shared.flags.uncertainty = true;
        notes.push("救援聯絡停止盲目前進，把最後路線留給團隊決定");
        break;
      case "R3_S_KEEP_GAO":
        updateTrack(state.shared, "gateStability", 1);
        updateTrack(state.shared, "gaoProtection", -1);
        notes.push("結構安全讓高承繼續守在機構旁，閘門穩一點但暴露增加");
        break;
      case "R3_S_ORDER_RETREAT":
        state.shared.flags.gaoRetreated = true;
        updateTrack(state.shared, "gaoProtection", 1);
        updateTrack(state.shared, "gateStability", -1);
        notes.push("結構安全命令高承撤到遮蔽處，高承先離開危險但閘門少一個支點");
        break;
      case "R3_S_HOLD_BRACE":
        updateTrack(state.shared, "gateStability", 1);
        updateTrack(state.shared, "gaoProtection", -1);
        notes.push("結構安全讓高承再撐一小段，閘門暫時不動但高承暴露增加");
        break;
      case "R3_S_PULL_TO_COVER":
        state.shared.flags.gaoRetreated = true;
        updateTrack(state.shared, "gaoProtection", 1);
        updateTrack(state.shared, "gateStability", -1);
        notes.push("結構安全立刻把高承拉回遮蔽處，高承先退開但閘門穩定少一點");
        break;
      default:
        break;
    }
  }
  state.shared.round3Summary = notes.join("；") || "最後窗口已關閉，現場只剩下最後決定。";
  state.shared.latestUpdate = state.shared.round3Summary;
}

function actionOptionLabel(state, roleId, round, actionId) {
  const seat = state.seats[roleId];
  const historyKey = round === 1 ? "round1" : round === 2 ? "round2" : "round3";
  return seat?.actionLabels?.[historyKey] || canonicalActionLabel(actionId);
}

function causalReasons(state, vote) {
  const operations = state.seats.operations;
  const rescue = state.seats.rescue;
  const safety = state.seats.safety;
  const routeStatus = state.shared.flags.routeCommitted || state.shared.flags.trolleyDispatched || state.shared.flags.alternateRoute
    ? "救援路線已經被推到現場"
    : state.shared.flags.uncertainty
      ? "救援路線仍留有不確定"
      : "救援路線沒有再往前推進";
  const reasons = [
    `現場調度先「${actionOptionLabel(state, "operations", 1, operations.round1Action)}」，接著「${actionOptionLabel(state, "operations", 2, operations.round2Action)}」，最後「${actionOptionLabel(state, "operations", 3, operations.round3Action)}」；備用電力現在是「${TRACK_LABELS.backupPower[state.shared.backupPower]}」，中央隔離閘是「${TRACK_LABELS.gateStability[state.shared.gateStability]}」。`,
    `救援聯絡從「${actionOptionLabel(state, "rescue", 1, rescue.round1Action)}」走到「${actionOptionLabel(state, "rescue", 2, rescue.round2Action)}」，最後「${actionOptionLabel(state, "rescue", 3, rescue.round3Action)}」；救援進度是「${TRACK_LABELS.rescueProgress[state.shared.rescueProgress]}」，${routeStatus}。`,
    `結構安全先「${actionOptionLabel(state, "safety", 1, safety.round1Action)}」，再「${actionOptionLabel(state, "safety", 2, safety.round2Action)}」，最後「${actionOptionLabel(state, "safety", 3, safety.round3Action)}」；高承防護現在是「${TRACK_LABELS.gaoProtection[state.shared.gaoProtection]}」，閘門狀態是「${TRACK_LABELS.gateStability[state.shared.gateStability]}」。`,
    `三人最後選了「${vote === "close" ? "現在關上中央隔離閘" : "讓中央隔離閘再開 95 秒"}」；上面三個條件已經把這次結果推到現在。`
  ];
  return reasons;
}

export function endingVariantFor(state, vote) {
  const rescueHigh = state.shared.rescueProgress >= 2;
  const gaoProtected = state.shared.gaoProtection >= 1;
  const gateStable = state.shared.gateStability >= 1;
  if (state.profile === "BREAKLINE") {
    if (vote === "close") return gaoProtected && gateStable ? "BREAKLINE_CLOSE_SAFE" : "BREAKLINE_CLOSE_EXPOSED";
    return rescueHigh && gaoProtected ? "BREAKLINE_HOLD_RETURN" : "BREAKLINE_HOLD_LOSS";
  }
  if (vote === "close") return rescueHigh && gaoProtected ? "BACKWASH_CLOSE_ROUTE" : "BACKWASH_CLOSE_DELAY";
  return rescueHigh && gaoProtected && gateStable ? "BACKWASH_HOLD_RETURN" : "BACKWASH_HOLD_EXPOSED";
}

export function endingDialogueId(variant) {
  return `A8_ENDING_${variant}`;
}

function makeEnding(state, vote) {
  const variant = endingVariantFor(state, vote);
  return {
    variant,
    dialogueId: endingDialogueId(variant),
    reasons: causalReasons(state, vote)
  };
}

export function endingReasonsFor(state, vote) {
  return causalReasons(state, vote);
}

function buildOperatorEventForRound2(state) {
  return makeEvent(state.profile === "BREAKLINE" ? "A8_ROUND2_REPORT_BREAKLINE" : "A8_ROUND2_REPORT_BACKWASH");
}

function buildOperatorEventForRound3(state) {
  return makeEvent(state.profile === "BREAKLINE" ? "A8_ROUND3_ESCALATION_BREAKLINE" : "A8_ROUND3_ESCALATION_BACKWASH");
}

function assertRoomInput(roomCode, profile, now) {
  if (typeof roomCode !== "string" || roomCode.length !== 6 || [...roomCode].some((character) => !ROOM_CODE_ALPHABET.includes(character))) throw new Error("INVALID_ROOM_CODE");
  if (!PROFILES.includes(profile)) throw new Error("INVALID_PROFILE");
  if (!Number.isFinite(now)) throw new Error("INVALID_TIME");
}

export function createRoom({ roomCode, profile = "BREAKLINE", now = Date.now() }) {
  assertRoomInput(roomCode, profile, now);
  const seats = Object.fromEntries(ROLE_IDS.map((roleId) => [roleId, makeSeat(roleId)]));
  return {
    schema: A8_SCHEMA,
    roomCode,
    profile,
    phase: "LOBBY",
    version: 0,
    createdAt: now,
    lastActivityAt: now,
    expiresAt: now + ROOM_TTL_MS,
    audioMasterRole: null,
    operatorEvent: null,
    shared: freshShared(),
    seats,
    ending: null,
    votePrompt: "",
    expired: false
  };
}

export function isExpired(state, now = Date.now()) {
  return state.expired === true || now >= state.expiresAt;
}

function errorResult(state, code, message) {
  return { ok: false, code, message, state };
}

function successResult(state, changed = true) {
  return { ok: true, state, changed };
}

function validateRole(roleId) {
  return typeof roleId === "string" && ROLE_IDS.includes(roleId);
}

function requireContext(state, command, now) {
  if (isExpired(state, now)) return { error: ["EXPIRED_ROOM", "這個事件已經結束，請重新建立事件。"] };
  if (!validateRole(command.roleId)) return { error: ["UNKNOWN_ROLE", "請選一個可用角色。"] };
  const seat = state.seats[command.roleId];
  if (typeof command.token !== "string" || !seat.token || command.token !== seat.token) {
    return { error: ["TOKEN_MISMATCH", "這支手機的角色連結已失效，請重新加入原本的角色。"] };
  }
  if (typeof command.version !== "number" || !Number.isInteger(command.version)) {
    return { error: ["MALFORMED_COMMAND", "這個動作資料不完整。"] };
  }
  const currentIndex = PHASE_INDEX.get(state.phase);
  const commandIndex = PHASE_INDEX.get(command.phase);
  if (!Number.isInteger(commandIndex)) return { error: ["UNKNOWN_PHASE", "這個畫面已經不是目前的事件段落。"] };
  if (commandIndex < currentIndex) return { error: ["STALE_PHASE", "畫面太慢了，請等目前事件更新。"] };
  if (commandIndex > currentIndex) return { error: ["FUTURE_PHASE", "這個動作還沒到可以做的時候。"] };
  if (command.version < state.version) return { error: ["STALE_VERSION", "畫面太慢了，請等目前事件更新。"] };
  if (command.version > state.version) return { error: ["FUTURE_VERSION", "這個畫面還沒有發生。"] };
  return { seat };
}

function increment(state, now) {
  state.version += 1;
  touch(state, now);
}

function startIntroIfReady(state) {
  if (allStarted(state) && state.phase === "LOBBY") {
    state.phase = "INTRO_1";
    state.operatorEvent = makeEvent("A8_INTRO_01");
    state.votePrompt = "";
    return true;
  }
  return false;
}

function validActionForState(state, roleId, actionId, round) {
  const options = round === 1 ? ACTIONS.ROUND1[roleId] : round === 2 ? round2OptionsFor(state, roleId) : round3OptionsFor(state, roleId);
  return options.some((option) => option.id === actionId);
}

function ensureOperatorComplete(state) {
  return !state.operatorEvent || state.operatorEvent.acknowledged === true;
}

function applyTakeover(state, command, now) {
  const seat = state.seats[command.roleId];
  if (seat.started) return errorResult(state, "DUPLICATE_ACTION", "你已經接手這個角色。");
  if (state.phase !== "LOBBY") return errorResult(state, "STALE_PHASE", "事件已經開始，不能在這裡重新接手角色。");
  seat.started = true;
  if (!state.audioMasterRole) state.audioMasterRole = command.roleId;
  startIntroIfReady(state);
  increment(state, now);
  return successResult(state);
}

function applyOperatorComplete(state, command, now) {
  if (!state.operatorEvent) return errorResult(state, "WRONG_OPERATOR_EVENT", "目前沒有需要完成的播報。");
  if (state.audioMasterRole !== command.roleId) return errorResult(state, "NOT_AUDIO_MASTER", "只有目前負責播放聲音的手機可以完成這段播報。");
  if (command.eventId !== state.operatorEvent.id) return errorResult(state, "WRONG_OPERATOR_EVENT", "這段播報已經換了，請使用目前畫面上的播報。");
  if (state.operatorEvent.acknowledged) return errorResult(state, "DUPLICATE_ACTION", "這段播報已經完成。");
  state.operatorEvent.acknowledged = true;
  if (phaseIsIntro(state.phase)) {
    const beat = Number(state.phase.slice("INTRO_".length));
    if (beat < 8) {
      state.phase = `INTRO_${beat + 1}`;
      state.operatorEvent = makeEvent(`A8_INTRO_${String(beat + 1).padStart(2, "0")}`);
    } else {
      state.phase = "ROUND1_ACTION";
      state.operatorEvent = null;
      state.shared.latestUpdate = "八段共同序幕完成。三人現在各自查一件不同的事，再把結果帶回來。";
    }
  }
  increment(state, now);
  return successResult(state);
}

function applyReady(state, command, now) {
  if (!ensureOperatorComplete(state)) return errorResult(state, "OPERATOR_PENDING", "先等這一段播報完成，再一起討論。");
  const seat = state.seats[command.roleId];
  if (seat.ready) return errorResult(state, "DUPLICATE_ACTION", "你已經表示討論完了。");
  seat.ready = true;
  if (allDiscussionReady(state)) {
    for (const roleId of ROLE_IDS) state.seats[roleId].ready = false;
    if (state.phase === "ROUND1_DISCUSS") {
      state.phase = "ROUND2_ACTION";
      state.shared.latestUpdate = "第一回合的查詢已留在各自手上；現在依照看到的狀況，做一個會改變現場的應變。";
    } else if (state.phase === "ROUND2_DISCUSS") {
      state.phase = "ROUND3_ACTION";
      state.operatorEvent = buildOperatorEventForRound3(state);
    } else if (state.phase === "ROUND3_DISCUSS") {
      state.phase = "FINAL_VOTE";
      state.operatorEvent = null;
      state.votePrompt = "先交換三個做法造成的代價，再由三人各自選一個最後動作。";
    }
  }
  increment(state, now);
  return successResult(state);
}

function applyRoundAction(state, command, now) {
  const seat = state.seats[command.roleId];
  const round = phaseRound(state.phase);
  const key = actionKeyForPhase(state.phase);
  if (!ensureOperatorComplete(state)) return errorResult(state, "OPERATOR_PENDING", "先等岬衛-7播報完這段現場更新。");
  if (seat[key]) return errorResult(state, "DUPLICATE_ACTION", "這一回合你已經確認過做法。");
  if (typeof command.actionId !== "string" || !validActionForState(state, command.roleId, command.actionId, round)) {
    return errorResult(state, "MALFORMED_ACTION", "這不是你目前角色能做的做法。");
  }
  seat[key] = command.actionId;
  if (round === 1) {
    seat.round1Result = resultFor(state.profile, command.actionId);
    seat.actionLabels.round1 = canonicalActionLabel(command.actionId);
  } else if (round === 2) {
    seat.actionLabels.round2 = canonicalActionLabel(command.actionId);
    seat.round2Result = { summary: `你確認了「${seat.actionLabels.round2}」。` };
  } else {
    seat.actionLabels.round3 = canonicalActionLabel(command.actionId);
    seat.round3Result = { summary: `你確認了「${seat.actionLabels.round3}」。` };
  }
  if (allActionsSubmitted(state, key)) {
    if (round === 1) {
      applyRound1Facts(state);
      state.phase = "ROUND1_DISCUSS";
      state.operatorEvent = makeEvent("A8_ROUND1_REPORT");
      state.shared.round1Summary = "三個人的查詢都完成了。先交換各自查到的和仍不知道的，再決定怎麼應變。";
      state.shared.latestUpdate = state.shared.round1Summary;
    } else if (round === 2) {
      resolveRound2(state);
      state.phase = "ROUND2_DISCUSS";
      state.operatorEvent = buildOperatorEventForRound2(state);
    } else {
      resolveRound3(state);
      state.phase = "ROUND3_DISCUSS";
      state.operatorEvent = makeEvent(state.profile === "BREAKLINE" ? "A8_ROUND3_REPORT_BREAKLINE" : "A8_ROUND3_REPORT_BACKWASH");
    }
  }
  increment(state, now);
  return successResult(state);
}

function applyVote(state, command, now) {
  if (command.vote !== "close" && command.vote !== "hold") return errorResult(state, "MALFORMED_ACTION", "請選一個最後動作。");
  const seat = state.seats[command.roleId];
  if (seat.vote === command.vote) return errorResult(state, "DUPLICATE_ACTION", "你已經選過這個最後動作。");
  seat.vote = command.vote;
  state.votePrompt = "三人的最後動作還沒有一致；先交換理由，再按下面的選項重選。";
  const votes = ROLE_IDS.map((roleId) => state.seats[roleId].vote);
  if (votes.every(Boolean) && new Set(votes).size === 1) {
    state.ending = makeEnding(state, command.vote);
    state.phase = "ENDING";
    state.operatorEvent = makeEvent(state.ending.dialogueId);
    state.votePrompt = "三人的最後動作一致了。播報完成後，請一起讀現場結果。";
  }
  increment(state, now);
  return successResult(state);
}

export function connectSeat(inputState, { roleId, token = null, connectionId, newToken, now = Date.now(), forceReconnect = false }) {
  const state = clone(inputState);
  if (isExpired(state, now)) return errorResult(inputState, "EXPIRED_ROOM", "這個事件已經結束，請重新建立事件。");
  if (!validateRole(roleId) || typeof connectionId !== "string" || !connectionId) return errorResult(inputState, "MALFORMED_JOIN", "加入資料不完整。");
  const seat = state.seats[roleId];
  if (!seat.token && token) return errorResult(inputState, "TOKEN_MISMATCH", "這個角色還沒有這支手機的連結。");
  if (seat.token && !token) return errorResult(inputState, "OCCUPIED_ROLE", "這個角色已經有人接手，請換一個角色。");
  if (seat.token && token !== seat.token) return errorResult(inputState, "TOKEN_MISMATCH", "這支手機的角色連結已失效。");
  if (seat.connected && !forceReconnect) return errorResult(inputState, "SEAT_ALREADY_CONNECTED", "這個角色已經在另一支手機上連線。");
  seat.token = seat.token || newToken;
  if (!seat.token || typeof seat.token !== "string") return errorResult(inputState, "MALFORMED_JOIN", "無法建立角色連結。");
  seat.connected = true;
  seat.connectionId = connectionId;
  if (!state.audioMasterRole) state.audioMasterRole = chooseAudioMaster(state) || roleId;
  increment(state, now);
  return { ...successResult(state), token: seat.token, roleId };
}

export function disconnectSeat(inputState, { roleId, connectionId, now = Date.now() }) {
  const state = clone(inputState);
  if (!validateRole(roleId)) return errorResult(inputState, "UNKNOWN_ROLE", "找不到這個角色。");
  const seat = state.seats[roleId];
  if (seat.connectionId !== connectionId) return { ok: true, changed: false, state: inputState };
  seat.connected = false;
  seat.connectionId = null;
  if (state.audioMasterRole === roleId) state.audioMasterRole = chooseAudioMaster(state);
  increment(state, now);
  return successResult(state);
}

export function applyCommand(inputState, command, now = Date.now()) {
  const state = clone(inputState);
  if (!command || typeof command !== "object" || Array.isArray(command) || typeof command.type !== "string") {
    return errorResult(inputState, "MALFORMED_COMMAND", "這個動作資料不完整。");
  }
  if (command.type === "TAKEOVER") {
    const context = requireContext(state, command, now);
    if (context.error) return errorResult(inputState, context.error[0], context.error[1]);
    return applyTakeover(state, command, now);
  }
  if (command.type === "COMPLETE_OPERATOR") {
    const context = requireContext(state, command, now);
    if (context.error) return errorResult(inputState, context.error[0], context.error[1]);
    return applyOperatorComplete(state, command, now);
  }
  if (command.type === "READY") {
    if (!["ROUND1_DISCUSS", "ROUND2_DISCUSS", "ROUND3_DISCUSS"].includes(state.phase)) {
      return errorResult(inputState, "STALE_PHASE", "現在不是交換發現的時候。");
    }
    const context = requireContext(state, command, now);
    if (context.error) return errorResult(inputState, context.error[0], context.error[1]);
    return applyReady(state, command, now);
  }
  if (command.type === "ACTION") {
    if (!["ROUND1_ACTION", "ROUND2_ACTION", "ROUND3_ACTION"].includes(state.phase)) {
      return errorResult(inputState, "STALE_PHASE", "現在不是做這個動作的時候。");
    }
    const context = requireContext(state, command, now);
    if (context.error) return errorResult(inputState, context.error[0], context.error[1]);
    return applyRoundAction(state, command, now);
  }
  if (command.type === "VOTE") {
    if (state.phase !== "FINAL_VOTE") return errorResult(inputState, "STALE_PHASE", "現在還不能做最後選擇。");
    const context = requireContext(state, command, now);
    if (context.error) return errorResult(inputState, context.error[0], context.error[1]);
    return applyVote(state, command, now);
  }
  return errorResult(inputState, "UNKNOWN_COMMAND", "這個動作目前不能使用。");
}

function publicSeat(state, roleId, currentRoleId) {
  const seat = state.seats[roleId];
  const actionKey = actionKeyForPhase(state.phase);
  return {
    roleId,
    roleLabel: ROLE_LABELS[roleId],
    occupied: Boolean(seat.token),
    connected: Boolean(seat.connected),
    started: Boolean(seat.started),
    completed: actionKey ? Boolean(seat[actionKey]) : false,
    ready: Boolean(seat.ready),
    isYou: roleId === currentRoleId
  };
}

function projectedPrivate(seat) {
  return {
    round1: seat.round1Result ? clone(seat.round1Result) : null,
    round2: seat.round2Result ? clone(seat.round2Result) : null,
    round3: seat.round3Result ? clone(seat.round3Result) : null
  };
}

function projectOptions(state, roleId) {
  if (state.phase === "ROUND1_ACTION") return clone(ACTIONS.ROUND1[roleId] || []);
  if (state.phase === "ROUND2_ACTION") return round2OptionsFor(state, roleId);
  if (state.phase === "ROUND3_ACTION") return round3OptionsFor(state, roleId);
  return [];
}

function phaseLabel(phase) {
  return {
    LOBBY: "等待三人接手角色",
    ROUND1_ACTION: "第一回合｜看清狀況",
    ROUND1_DISCUSS: "第一回合｜交換發現",
    ROUND2_ACTION: "第二回合｜做出應變",
    ROUND2_DISCUSS: "第二回合｜交換現場結果",
    ROUND3_ACTION: "第三回合｜最後窗口",
    ROUND3_DISCUSS: "第三回合｜交換最後結果",
    FINAL_VOTE: "一起選最後動作",
    ENDING: "事件結果"
  }[phase] || (phaseIsIntro(phase) ? `共同序幕｜第 ${phase.slice(-1)} 段` : phase);
}

export function projectRoomState(state, currentRoleId = null) {
  const seat = validateRole(currentRoleId) ? state.seats[currentRoleId] : null;
  const actionKey = actionKeyForPhase(state.phase);
  const privateData = seat ? projectedPrivate(seat) : null;
  return {
    roomCode: state.roomCode,
    phase: state.phase,
    phaseLabel: phaseLabel(state.phase),
    version: state.version,
    expiresAt: state.expiresAt,
    audioMasterRole: state.audioMasterRole,
    audioMasterLabel: state.audioMasterRole ? ROLE_LABELS[state.audioMasterRole] : null,
    operatorEvent: state.operatorEvent ? clone(state.operatorEvent) : null,
    seats: ROLE_IDS.map((roleId) => publicSeat(state, roleId, currentRoleId)),
    shared: {
      tracks: {
        rescueProgress: TRACK_LABELS.rescueProgress[state.shared.rescueProgress],
        gateStability: TRACK_LABELS.gateStability[state.shared.gateStability],
        gaoProtection: TRACK_LABELS.gaoProtection[state.shared.gaoProtection],
        backupPower: TRACK_LABELS.backupPower[state.shared.backupPower]
      },
      round1Summary: state.shared.round1Summary,
      round2Summary: state.shared.round2Summary,
      round3Summary: state.shared.round3Summary,
      escalation: state.shared.escalation,
      latestUpdate: state.shared.latestUpdate
    },
    currentSeat: seat ? {
      roleId: currentRoleId,
      roleLabel: ROLE_LABELS[currentRoleId],
      started: seat.started,
      completed: actionKey ? Boolean(seat[actionKey]) : false,
      ready: seat.ready,
      selectedAction: actionKey ? seat[actionKey] : null,
      vote: state.phase === "FINAL_VOTE" || state.phase === "ENDING" ? seat.vote : null,
      private: privateData
    } : null,
    options: seat ? projectOptions(state, currentRoleId) : [],
    votePrompt: state.votePrompt,
    ending: state.ending ? { dialogueId: state.ending.dialogueId, reasons: clone(state.ending.reasons) } : null
  };
}

export function publicLobbyState(state) {
  return {
    roomCode: state.roomCode,
    phase: state.phase,
    phaseLabel: phaseLabel(state.phase),
    version: state.version,
    expiresAt: state.expiresAt,
    audioMasterRole: state.audioMasterRole,
    seats: ROLE_IDS.map((roleId) => publicSeat(state, roleId, null))
  };

}

export function randomRoomCode(random = Math.random) {
  let code = "";
  for (let i = 0; i < 6; i += 1) code += ROOM_CODE_ALPHABET[Math.floor(random() * ROOM_CODE_ALPHABET.length)];
  return code;
}

export function randomProfile(random = Math.random) {
  return random() < 0.5 ? "BREAKLINE" : "BACKWASH";
}

export function inspectStateForTests(state) {
  return {
    phase: state.phase,
    version: state.version,
    profile: state.profile,
    roomCode: state.roomCode,
    tracks: clone(state.shared),
    seats: clone(state.seats),
    ending: clone(state.ending)
  };
}
