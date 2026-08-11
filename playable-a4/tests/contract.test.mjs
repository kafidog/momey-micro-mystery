import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const routeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(routeRoot, "..");
const read = (relative) => fs.readFileSync(path.join(routeRoot, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(routeRoot, relative));
const sha256 = (relative) => crypto.createHash("sha256").update(fs.readFileSync(path.join(routeRoot, relative))).digest("hex");
const roleFiles = ["role-1.html", "role-2.html", "role-3.html"];
const htmlFiles = ["index.html", ...roleFiles];
const panels = Array.from({ length: 6 }, (_, index) => `assets/storyboard/panel-${String(index + 1).padStart(2, "0")}.webp`);
const expectedPanelHashes = {
  "assets/storyboard/panel-01.webp": "d5f26573b9e69cc4b0f7f88176a59724ac76cdb875448b1efccaafbb9490a2f5",
  "assets/storyboard/panel-02.webp": "3fcf00a2e1511d52e40e5f17cab0744e2e86115d333709fee78c7ac43e09ae43",
  "assets/storyboard/panel-03.webp": "0dc21bc77da3006c6dde1b12a39b4b6b9858458dfaeda41136d9adaba15c59f6",
  "assets/storyboard/panel-04.webp": "a7074961a81c299f3d401f5303fdeb09886f572336c8166b9a1baf4a4995a04e",
  "assets/storyboard/panel-05.webp": "d510967274ef37a2160ef728b6e2941ba38dbb9d620bc946d9f246ace12694f5",
  "assets/storyboard/panel-06.webp": "0f9439c2def4223c629757bf849cde6e9c6208be741fa25f1cc4509eb10ad044"
};
const requiredRootDocs = [
  "00_A4_OVERVIEW.md",
  "01_A3_TO_A4_DESIGN_DECISION.md",
  "02_PERSPECTIVE_JUDGMENT_ARCHITECTURE.md",
  "03_INITIAL_JUDGMENT.md",
  "04_OPEN_SHARING_FLOW.md",
  "05_VERIFICATION_LINK_TO_DISAGREEMENT.md",
  "06_RECONSIDERATION.md",
  "07_FINAL_COMMITMENT.md",
  "08_INFORMATION_ARCHITECTURE.md",
  "09_DIVERGENT_JUDGMENT_TEST.md",
  "10_CHANGE_OF_MIND_TEST.md",
  "11_FULL_SHARING_STRESS_TEST.md",
  "12_ALPHA_PLAYER_REVIEW.md",
  "13_SYNTHETIC_PLAYTHROUGH.md",
  "14_SOL_HIGH_ADVERSARIAL_REVIEW.md",
  "15_DEFECT_REPORT.md",
  "16_PLAYTEST_INSTRUCTIONS.md",
  "17_KNOWN_LIMITATIONS.md",
  "18_AGENT_EXECUTION_RECORD.md",
  "CODEX_HANDOFF.md",
  "README.md",
  "SCREENSHOT_INDEX.md"
].sort();

function makeSeat(overrides = {}) {
  return {
    actionComplete: false,
    initialJudgment: null,
    initialJudgmentLocked: false,
    teamReady: false,
    reconsideration: null,
    postVerificationReady: false,
    ...overrides
  };
}

function sharingReady(seat) {
  return seat.actionComplete === true && Boolean(seat.initialJudgment) && seat.teamReady === true;
}

function postVerificationReady(seat, shared) {
  return sharingReady(seat) && Boolean(shared.verificationConfirmed) && Boolean(seat.reconsideration) && seat.postVerificationReady === true;
}

function chooseInitial(seat, choice) {
  if (!seat.actionComplete || seat.teamReady || !["close", "hold", "unsure"].includes(choice)) return false;
  seat.initialJudgment = choice;
  return true;
}

function confirmSharing(seat) {
  if (!seat.actionComplete || !seat.initialJudgment || seat.teamReady) return false;
  seat.teamReady = true;
  seat.initialJudgmentLocked = true;
  return true;
}

function verificationModel() {
  return {
    draft: null,
    confirmed: null,
    resultVisible: false,
    choose(choice) {
      if (this.confirmed || !["A", "B"].includes(choice)) return false;
      this.draft = choice;
      return true;
    },
    confirm() {
      if (!this.draft || this.confirmed) return false;
      this.confirmed = this.draft;
      this.resultVisible = true;
      return true;
    }
  };
}

test("A4 route contains exactly the required root documents, runtime files, tests, and placeholders", () => {
  const rootDocs = fs.readdirSync(routeRoot).filter((name) => name.endsWith(".md")).sort();
  assert.deepEqual(rootDocs, requiredRootDocs);
  for (const file of [...htmlFiles, "assets/app.js", "assets/styles.css", "tests/contract.test.mjs", "tests/render-smoke.cjs", "screenshots/README.md", "source_snapshot/README.md", ...panels]) {
    assert.equal(exists(file), true, `missing ${file}`);
  }
});

test("the six storyboard images match the frozen byte hashes exactly", () => {
  assert.equal(Object.keys(expectedPanelHashes).length, 6);
  for (const panel of panels) {
    assert.ok(fs.statSync(path.join(routeRoot, panel)).size > 10000, `${panel} unexpectedly small`);
    assert.equal(sha256(panel), expectedPanelHashes[panel], `${panel} hash drifted`);
  }
});

test("the six-panel story, fixed truth, three allies, and three distinct roles remain", () => {
  const index = read("index.html");
  for (const marker of ["海岬防洪站", "18:40", "18:47", "18:48", "林芮", "高承", "西側維修隧道", "東閘", "一個高能診斷脈衝", "立即封閉", "維持 95 秒", "你們是同一隊。知道的都可以說；每個人能做的事不同。"]) {
    assert.ok(index.includes(marker), `story marker missing: ${marker}`);
  }
  assert.equal(index.match(/class="story-panel(?: story-panel-final)?"/g)?.length, 6);
  assert.equal(new Set(roleFiles.map((file) => read(file).match(/data-role="([123])"/)?.[1])).size, 3);
});

test("all three A3 role tools remain operational and evidence stays hidden until completion", () => {
  const app = read("assets/app.js");
  const keys = [...app.matchAll(/actionKey:\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(keys, ["timeline-alignment", "signal-source-inspection", "pressure-projection"]);
  for (const marker of ["data-command-process", "data-command-endpoint", "data-inspect-field", "data-pressure-range", "data-pressure-marker", "選錯只會提示你換一個終點", "四個欄位都看過", "中間投影"]) {
    assert.ok(app.includes(marker), `tool marker missing: ${marker}`);
  }
  assert.match(app, /if \(!seat\.actionComplete\)\s*\{[\s\S]*?node\.hidden = true/);
  assert.ok(app.includes('closureDone ? "21.05%" : "100%"'), "command answer must not be pre-rendered as final relative length");
  assert.ok(app.includes('finished ? "對齊完成：封閉在 t=20 秒切斷路線，救援要到 t=95 秒才完成。" : "把兩段流程放上同一條時間軌，再看它們之間發生什麼。"'));
});

test("A4 uses an isolated prefix and preserves A1, A2, and A3 state names", () => {
  const app = read("assets/app.js");
  assert.ok(app.includes('const STORAGE_PREFIX = "momey-a4:"'));
  assert.equal(app.includes('const STORAGE_PREFIX = "momey-a3:"'), false);
  assert.ok(app.includes('window.MomeyA4 ='));
  assert.equal(app.includes('window.MomeyA3 ='), false);
});

test("current judgment offers close, hold, and unsure in one fixed neutral order", () => {
  const app = read("assets/app.js");
  const css = read("assets/styles.css");
  const order = [app.indexOf('{ key: "close", label: "立即封閉"'), app.indexOf('{ key: "hold", label: "維持救援窗口"'), app.indexOf('{ key: "unsure", label: "還不能判斷"')];
  assert.ok(order.every((value) => value >= 0));
  assert.ok(order[0] < order[1] && order[1] < order[2], "judgment order must be close, hold, unsure");
  assert.ok(app.includes('class="judgment-choice ${selected ? "is-selected" : ""}"'));
  assert.equal(app.includes("judgment-close"), false);
  assert.equal(app.includes("judgment-hold"), false);
  assert.equal(app.includes("judgment-unsure"), false);
  assert.match(css, /\.judgment-choice\.is-selected,\s*\n\.reconsideration-choice\.is-selected\s*\{[\s\S]*?border-color:\s*var\(--amber\)/);
});

test("initial judgment is required before teamReady and becomes an immutable local baseline", () => {
  const app = read("assets/app.js");
  const seat = makeSeat({ actionComplete: true });
  assert.equal(confirmSharing(seat), false, "sharing cannot confirm without judgment");
  assert.equal(chooseInitial(seat, "unsure"), true);
  assert.equal(confirmSharing(seat), true);
  assert.equal(seat.initialJudgment, "unsure");
  assert.equal(seat.initialJudgmentLocked, true);
  assert.equal(chooseInitial(seat, "close"), false, "baseline cannot change after teamReady");
  assert.equal(seat.initialJudgment, "unsure");
  assert.match(app, /seat\.actionComplete && seat\.initialJudgment && !seat\.teamReady/);
  assert.match(app, /if \(!seat\.actionComplete \|\| seat\.teamReady \|\| !optionByKey\(judgmentOptions, key\)\) return/);
  assert.ok(app.includes("initialJudgmentLocked: true"));
});

test("divergent, two-plus-one, unsure, and unanimous initial judgments all reach sharing", () => {
  const scenarios = [
    ["close", "hold", "unsure"],
    ["close", "close", "hold"],
    ["unsure", "unsure", "close"],
    ["hold", "hold", "hold"]
  ];
  for (const choices of scenarios) {
    const seats = choices.map(() => makeSeat({ actionComplete: true }));
    choices.forEach((choice, index) => {
      assert.equal(chooseInitial(seats[index], choice), true);
      assert.equal(confirmSharing(seats[index]), true);
      assert.equal(sharingReady(seats[index]), true);
    });
  }
});

test("fact and judgment are visibly separate, current rather than final, and openly shareable", () => {
  const app = read("assets/app.js");
  for (const marker of ["STAGE 03｜證據／目前判斷", "這是你帶回隊伍的證據", "你目前的判斷", "不是最後決定、不是秘密，也不是投票", "所有事實和這個判斷都可以", "公開分享證據、判斷與理由"]) {
    assert.ok(app.includes(marker), `fact/judgment contract missing: ${marker}`);
  }
  const ownEvidenceRenderer = app.slice(app.indexOf("function renderOwnEvidence"), app.indexOf("function contributionPrompts"));
  assert.ok(ownEvidenceRenderer.indexOf("evidenceCard(role.result") < ownEvidenceRenderer.indexOf("renderJudgmentChoices(seat)"));
  assert.equal(/>[^<]*baseline[^<]*</i.test(app), false, "internal baseline jargon must not appear in player-facing markup");
});

test("sharing keeps a factual compact board without vote aggregation or synchronization claims", () => {
  const app = read("assets/app.js");
  for (const marker of ["compactTeamBoard", "20 秒封閉會切斷 95 秒救援", "林芮有可信回應；即時位置／路線未知", "95 秒壓力抵達東閘；撐架承載未知", "只記下這支手機", "不代替隊伍彼此說清楚", "你一開始的判斷"]) {
    assert.ok(app.includes(marker), `sharing marker missing: ${marker}`);
  }
  for (const forbidden of ["renderSharedEvidence", "aggregateJudgment", "voteCount", "allJudgments", "syncState", "ROLE_IDS.map((roleId) =>", "ROLE_IDS.every"] ) {
    assert.equal(app.includes(forbidden), false, `forbidden sharing/sync pattern: ${forbidden}`);
  }
  assert.equal(/\d+\s*票/.test(app), false, "no vote count may be rendered");
});

test("A/B verification supports draft change, hides result before confirm, then locks", () => {
  const app = read("assets/app.js");
  const model = verificationModel();
  assert.equal(model.choose("A"), true);
  assert.equal(model.resultVisible, false);
  assert.equal(model.choose("B"), true);
  assert.equal(model.draft, "B");
  assert.equal(model.resultVisible, false);
  assert.equal(model.confirm(), true);
  assert.equal(model.confirmed, "B");
  assert.equal(model.resultVisible, true);
  assert.equal(model.choose("A"), false, "confirmed verification must lock");
  for (const marker of ["目前仍有兩個關鍵未知", "你們只能查一個。哪一個未知最值得現在確認？", "verificationDraft", "verificationConfirmed", "verificationResult", "data-verify-option", "data-verify-confirm", "data-verification-result"]) {
    assert.ok(app.includes(marker), `verification marker missing: ${marker}`);
  }
  assert.match(app, /const result = confirmed \? `<div class="verification-result"/);
});

test("reconsideration has changed, unchanged, and still-unsure without a second decision vote", () => {
  const app = read("assets/app.js");
  const order = [app.indexOf('{ key: "changed", label: "改變了"'), app.indexOf('{ key: "unchanged", label: "沒改變"'), app.indexOf('{ key: "still-unsure", label: "我仍不確定"')];
  assert.ok(order.every((value) => value >= 0));
  assert.ok(order[0] < order[1] && order[1] < order[2]);
  for (const marker of ["reconsideration", "postVerificationReady", "看到「", "你的判斷有變嗎？", "這次查證改變了誰的判斷？為什麼？", "改變或維持都可以；把原因說清楚，就能繼續。"]) {
    assert.ok(app.includes(marker), `reconsideration marker missing: ${marker}`);
  }
  assert.equal(app.includes("data-reconsideration-close"), false);
  assert.equal(app.includes("data-reconsideration-hold"), false);
  assert.ok(app.includes('seat.reconsideration ? "已記下；現在說明誰改變、為什麼。" : "先選一個最符合你現在狀態的答案。"'));
});

test("one, multiple, no, or still-unsure change-of-mind states all permit post-verification readiness", () => {
  const scenarios = [
    ["changed", "unchanged", "unchanged"],
    ["changed", "changed", "unchanged"],
    ["unchanged", "unchanged", "unchanged"],
    ["still-unsure", "changed", "unchanged"]
  ];
  for (const reflections of scenarios) {
    const seats = reflections.map((reconsideration) => makeSeat({
      actionComplete: true,
      initialJudgment: "unsure",
      initialJudgmentLocked: true,
      teamReady: true,
      reconsideration,
      postVerificationReady: true
    }));
    assert.ok(seats.every((seat) => postVerificationReady(seat, { verificationConfirmed: "A" })));
  }
});

test("final choice remains gated until postVerificationReady", () => {
  const app = read("assets/app.js");
  const shared = { verificationConfirmed: "A" };
  const seat = makeSeat({ actionComplete: true, initialJudgment: "hold", teamReady: true });
  assert.equal(postVerificationReady(seat, shared), false);
  seat.reconsideration = "unchanged";
  assert.equal(postVerificationReady(seat, shared), false);
  seat.postVerificationReady = true;
  assert.equal(postVerificationReady(seat, shared), true);
  assert.match(app, /finalChoice && !finalChoice\.disabled && currentPostVerificationReady\(\)/);
  assert.match(app, /finalConfirm && !finalConfirm\.disabled && currentPostVerificationReady\(\)/);
  for (const marker of ["已確認", "仍未知", "現在必須決定", "立即封閉", "維持 95 秒", "data-final-choice", "data-final-confirm"]) {
    assert.ok(app.includes(marker), `final marker missing: ${marker}`);
  }
});

test("all four A/B by close/hold consequence branches remain reachable", () => {
  const app = read("assets/app.js");
  for (const key of ["A|close", "A|hold", "B|close", "B|hold"]) assert.ok(app.includes(`"${key}"`), `missing branch ${key}`);
  for (const marker of ["西側推車路線被切斷", "替代進入路線到達前，她失去生命", "救援推車沿可通軌道清出西側路線", "高承留到控制廊隔離完成", "如果重來一次，你們還會做同樣的決定嗎？"]) {
    assert.ok(app.includes(marker), `consequence marker missing: ${marker}`);
  }
});

test("tool, judgment, sharing, reconsideration, verification, final, and consequence state serialize across refresh", () => {
  const state = {
    toolProgress: { inspected: ["signature", "response"] },
    actionComplete: true,
    initialJudgment: "unsure",
    initialJudgmentLocked: true,
    teamReady: true,
    reconsideration: "still-unsure",
    postVerificationReady: true
  };
  const shared = {
    verificationDraft: "B",
    verificationConfirmed: "B",
    verificationResult: { key: "B" },
    finalDraft: "hold",
    finalConfirmed: "hold",
    consequence: { decision: "維持 95 秒" }
  };
  const restoredSeat = JSON.parse(JSON.stringify(state));
  const restoredShared = JSON.parse(JSON.stringify(shared));
  assert.deepEqual(restoredSeat, state);
  assert.deepEqual(restoredShared, shared);
  assert.equal(postVerificationReady(restoredSeat, restoredShared), true);
  const app = read("assets/app.js");
  for (const key of ["toolProgress", "initialJudgment", "teamReady", "reconsideration", "postVerificationReady", "verificationDraft", "verificationConfirmed", "verificationResult", "finalDraft", "finalConfirmed", "consequence"]) {
    assert.ok(app.includes(key), `persisted state missing: ${key}`);
  }
});

test("reset clears only momey-a4 keys", () => {
  const app = read("assets/app.js");
  assert.ok(app.includes("Object.keys(store).filter((key) => key.startsWith(STORAGE_PREFIX))"));
  const storage = new Map([
    ["momey-a4:seat:1", "remove"], ["momey-a4:shared", "remove"],
    ["momey-a3:shared", "keep"], ["momey-a2:shared", "keep"], ["momey-a1:shared", "keep"], ["other", "keep"]
  ]);
  [...storage.keys()].filter((key) => key.startsWith("momey-a4:")).forEach((key) => storage.delete(key));
  assert.deepEqual([...storage.keys()].sort(), ["momey-a1:shared", "momey-a2:shared", "momey-a3:shared", "other"]);
});

test("touch and mobile guardrails cover judgment and reconsideration controls", () => {
  const css = read("assets/styles.css");
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /@media\s*\(max-width:\s*660px\)/);
  assert.match(css, /\.judgment-grid,[\s\S]*?\.reconsideration-grid/);
  assert.match(css, /\.judgment-choice,[\s\S]*?min-height:\s*112px/);
  assert.match(css, /@media\s*\(max-width:\s*660px\)[\s\S]*?\.judgment-grid,[\s\S]*?grid-template-columns:\s*1fr/);
  assert.ok(css.includes(".pressure-range"));
});

test("runtime contains no forbidden infrastructure and protected paths have no changes", () => {
  const source = htmlFiles.map(read).join("\n") + read("assets/app.js") + read("assets/styles.css");
  for (const forbidden of ["fetch(", "WebSocket", "EventSource", "gtag", "Google Analytics", "D1", "Cloudflare", "Threads", "Portaly", "payment", "account", "localStorage.clear("]) {
    assert.equal(source.includes(forbidden), false, `forbidden runtime marker: ${forbidden}`);
  }
  const protectedPaths = ["playable-a1", "playable-a2", "playable-a3", "index.html", "script.js", "styles.css", "sr-h1", "sr-h2", "sr-h3", "sr-assets", "worker", ".wrangler"];
  const diff = spawnSync("git", ["diff", "--quiet", "HEAD", "--", ...protectedPaths], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(diff.status, 0, diff.stderr || "protected-path diff failed");
  const status = spawnSync("git", ["status", "--short", "--untracked-files=all", "--", ...protectedPaths], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(status.status, 0, status.stderr || "protected-path status failed");
  assert.equal(status.stdout.trim(), "", `protected paths changed:\n${status.stdout}`);
});

test("handoff documents remain internally consistent before or after final delivery", () => {
  const solReview = read("14_SOL_HIGH_ADVERSARIAL_REVIEW.md");
  const record = read("18_AGENT_EXECUTION_RECORD.md");
  assert.ok(record.includes("HEAD_BEFORE = 7429d3a16d6fb606ee880fadb3164225d67c96b8"));
  const pending = solReview.includes("PENDING_SOL_REVIEW");
  const passed = solReview.includes("SOL_HIGH_FINAL_REVIEW = PASS");
  assert.notEqual(pending, passed, "review must be exactly pending or final PASS");
  if (pending) {
    for (const marker of ["FINAL_RUNTIME_COMMIT = NOT CREATED", "DEPLOYMENT_STATUS = NOT DEPLOYED", "PACKAGING_STATUS = NOT PACKAGED"]) {
      assert.ok(record.includes(marker), `pending execution record missing: ${marker}`);
    }
  } else {
    assert.match(record, /FINAL_RUNTIME_COMMIT = [0-9a-f]{40}/);
    assert.match(record, /FINAL_HEAD = [0-9a-f]{40}/);
    assert.ok(record.includes("DEPLOYMENT_STATUS = DEPLOYED_AND_PUBLICLY_VERIFIED_UNADVERTISED"));
    assert.ok(record.includes("DEPLOYED_URL = https://kafidog.github.io/momey-micro-mystery/playable-a4/"));
    assert.ok(record.includes("PACKAGING_STATUS = COMPLETE"));
  }
});
