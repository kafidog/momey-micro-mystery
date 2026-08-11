import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const routeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(routeRoot, "..");
const a2Root = path.join(repoRoot, "playable-a2");
const read = (relative) => fs.readFileSync(path.join(routeRoot, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(routeRoot, relative));
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const roleFiles = ["role-1.html", "role-2.html", "role-3.html"];
const htmlFiles = ["index.html", ...roleFiles];
const panels = Array.from({ length: 6 }, (_, index) => `assets/storyboard/panel-${String(index + 1).padStart(2, "0")}.webp`);
const reviewDocs = [
  "00_A3_OVERVIEW.md", "01_A2_TO_A3_DESIGN_DECISION.md", "02_ROLE_TOOL_ARCHITECTURE.md", "03_COMMAND_TOOL.md",
  "04_RESCUE_TOOL.md", "05_SAFETY_TOOL.md", "06_HUMAN_EXCHANGE_DESIGN.md", "07_INFORMATION_ARCHITECTURE.md",
  "08_LIMITED_VERIFICATION.md", "09_DECISION_CONSEQUENCE_MAP.md", "10_FULL_SHARING_STRESS_TEST.md", "11_ROLE_TOOL_REMOVAL_TEST.md",
  "12_SYNTHETIC_PLAYTHROUGH.md", "13_SOL_HIGH_ADVERSARIAL_REVIEW.md", "14_DEFECT_REPORT.md", "15_PLAYTEST_INSTRUCTIONS.md",
  "16_KNOWN_LIMITATIONS.md", "17_AGENT_EXECUTION_RECORD.md", "README.md", "SCREENSHOT_INDEX.md",
  "source_snapshot/README.md", "screenshots/README.md", "CODEX_HANDOFF.md"
];

function modelCommand() {
  const state = { actionComplete: false, feedback: "", selectedProcess: null, alignment: { closure: null, rescue: null } };
  const chooseProcess = (process) => { state.selectedProcess = process; };
  const chooseEndpoint = (endpoint) => {
    if (!state.selectedProcess) return;
    const expected = state.selectedProcess === "closure" ? "20" : "95";
    if (endpoint !== expected) {
      state.feedback = "這不是正確終點，可以再試一次。";
      return;
    }
    state.alignment[state.selectedProcess] = endpoint;
    state.selectedProcess = null;
    state.feedback = "這段流程已對齊。";
    state.actionComplete = state.alignment.closure === "20" && state.alignment.rescue === "95";
  };
  return { state, chooseProcess, chooseEndpoint };
}

function modelRescue() {
  const state = { actionComplete: false, inspected: [], feedback: "" };
  const inspect = (field) => {
    if (!state.inspected.includes(field)) state.inspected.push(field);
    state.actionComplete = ["signature", "response", "freshness", "route"].every((key) => state.inspected.includes(key));
    state.feedback = state.actionComplete ? "四個欄位都已看過。" : `已看 ${state.inspected.length}/4 個欄位。`;
  };
  return { state, inspect };
}

function modelSafety() {
  const state = { actionComplete: false, seconds: 0, feedback: "" };
  const move = (seconds) => {
    state.seconds = Math.max(0, Math.min(95, seconds));
    state.actionComplete = state.seconds === 95;
    state.feedback = state.actionComplete ? "壓力前緣抵達東閘。撐架承載仍未知。" : "中間投影，不算失敗。";
  };
  return { state, move };
}

function isolatedSession(roleId) {
  const storage = new Map();
  const seat = () => storage.get(`momey-a3:seat:${roleId}`) || { actionComplete: false, teamReady: false };
  const ready = () => seat().actionComplete === true && seat().teamReady === true;
  return { roleId, storage, seat, ready };
}

test("A3 required route files and exact six storyboard copies exist", () => {
  for (const file of [...htmlFiles, "assets/app.js", "assets/styles.css", "tests/contract.test.mjs", ...reviewDocs, ...panels]) {
    assert.equal(exists(file), true, `missing ${file}`);
  }
  for (const panel of panels) {
    const source = path.join(a2Root, panel);
    const copy = path.join(routeRoot, panel);
    assert.ok(fs.statSync(copy).size > 10000, `${panel} unexpectedly small`);
    assert.equal(sha256(copy), sha256(source), `${panel} is not byte-for-byte identical to A2`);
  }
});

test("A2 six-panel story, truth, and ally frame remain in A3", () => {
  const index = read("index.html");
  for (const marker of ["海岬防洪站", "西側維修隧道", "中央控制廊", "東閘", "18:40", "18:47", "18:48", "林芮", "高承", "主電力", "中央遙測", "一個高能診斷脈衝", "立即封閉", "維持 95 秒", "你們是同一隊。知道的都可以說；每個人能做的事不同。"]) {
    assert.ok(index.includes(marker), `story marker missing: ${marker}`);
  }
  assert.equal(index.match(/class="story-panel(?: story-panel-final)?"/g)?.length, 6, "A3 must retain six story panels");
  assert.equal(index.includes("panel-02.webp") && index.includes("panel-06.webp"), true);
});

test("three role tools are distinct and expose the fixed interaction contract", () => {
  const app = read("assets/app.js");
  const keys = [...app.matchAll(/actionKey:\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(keys, ["timeline-alignment", "signal-source-inspection", "pressure-projection"]);
  for (const phrase of ["共同 0–95 秒軌", "遠端封閉 20 秒", "救援清線 95 秒", "data-command-process", "data-command-endpoint", "選錯只會提示你換一個終點", "data-inspect-field", "裝置簽名", "兩點回應", "時間邊界", "位置／路線", "data-pressure-range", "data-pressure-marker", "壓力前緣沿東側路徑前進"]) {
    assert.ok(app.includes(phrase), `tool contract missing: ${phrase}`);
  }
  assert.equal(new Set(roleFiles.map((file) => read(file).match(/data-role="([123])"/)?.[1])).size, 3);
});

test("each tool requires a real operation, stays gentle, and hides evidence until complete", () => {
  const app = read("assets/app.js");
  assert.ok(app.includes('finished ? "對齊完成：封閉在 t=20 秒切斷路線，救援要到 t=95 秒才完成。" : "把兩段流程放上同一條時間軌，再看它們之間發生什麼。"'), "command conflict must only appear after alignment");
  assert.equal(app.includes('<p class="timeline-note">共同 0–95 秒軌：遠端封閉在 t=20 秒切斷路線'), false, "command tool must not print the deduction before completion");
  assert.ok(app.includes('closureDone ? "21.05%" : "100%"'), "unaligned command bar must not reveal the final relative length");
  const command = modelCommand();
  assert.equal(command.state.actionComplete, false);
  command.chooseProcess("closure");
  command.chooseEndpoint("95");
  assert.equal(command.state.actionComplete, false, "wrong endpoint must not complete command tool");
  assert.match(command.state.feedback, /不是|再試/);
  command.chooseEndpoint("20");
  command.chooseProcess("rescue");
  command.chooseEndpoint("95");
  assert.equal(command.state.actionComplete, true, "both correct command endpoints must complete");

  const rescue = modelRescue();
  rescue.inspect("signature"); rescue.inspect("response"); rescue.inspect("freshness");
  assert.equal(rescue.state.actionComplete, false, "rescue result must remain hidden before four fields");
  rescue.inspect("route");
  assert.equal(rescue.state.actionComplete, true);

  const safety = modelSafety();
  safety.move(40);
  assert.equal(safety.state.actionComplete, false, "intermediate pressure projection is not failure or completion");
  assert.match(safety.state.feedback, /中間投影/);
  safety.move(95);
  assert.equal(safety.state.actionComplete, true);

  assert.match(app, /if \(!seat\.actionComplete\)\s*\{[\s\S]*?node\.hidden = true/);
  assert.match(app, /const result = confirmed \? `.*data-verification-result/s);
  assert.equal(app.includes("game over"), false);
  assert.equal(app.includes("答錯"), false);
});

test("tool-specific progress and own evidence survive serialization and can be reopened", () => {
  const app = read("assets/app.js");
  const command = modelCommand();
  command.chooseProcess("closure"); command.chooseEndpoint("20");
  const serialized = JSON.parse(JSON.stringify({ toolProgress: command.state, actionComplete: false }));
  assert.equal(serialized.toolProgress.alignment.closure, "20");
  assert.ok(app.includes("toolProgress"));
  assert.ok(app.includes("actionAt"));
  assert.ok(app.includes("teamReadyAt"));
  assert.ok(app.includes("<details class=\"own-evidence\" open><summary>重新查看我的證據</summary>"));
  assert.ok(app.includes("evidenceCard(role.result, \"own-evidence-card\")"));
});

test("public sharing has no shared full-evidence renderer and only exposes the compact three-line board", () => {
  const app = read("assets/app.js");
  for (const phrase of ["compactTeamBoard", "20 秒封閉會切斷 95 秒救援", "林芮有可信回應；即時位置／路線未知", "95 秒壓力抵達東閘；撐架承載未知", "三個人的結果都已經說完了"]) assert.ok(app.includes(phrase), `compact sharing marker missing: ${phrase}`);
  assert.equal(app.includes("renderSharedEvidence"), false);
  assert.equal(app.includes("shared-evidence-grid"), false);
  assert.equal(app.includes("ROLE_IDS.map((roleId) =>"), false);
  assert.ok(app.includes("你的時間線發現了什麼衝突？"));
  assert.ok(app.includes("這個訊號能證明什麼？還缺什麼？"));
  assert.ok(app.includes("95 秒會把風險推到哪裡？"));
});

test("three isolated sessions require only their own action plus spoken-sharing confirmation", () => {
  const app = read("assets/app.js");
  assert.match(app, /function currentSessionReady\(\)\s*\{[\s\S]*?seat\.actionComplete === true && seat\.teamReady === true/);
  assert.equal(app.includes("allActionsComplete"), false);
  assert.equal(app.includes("completedCount"), false);
  assert.equal(app.includes("ROLE_IDS.every"), false);
  const sessions = ["1", "2", "3"].map(isolatedSession);
  for (const session of sessions) {
    assert.equal(session.ready(), false);
    session.storage.set(`momey-a3:seat:${session.roleId}`, { actionComplete: true, teamReady: false });
    assert.equal(session.ready(), false);
    session.storage.set(`momey-a3:seat:${session.roleId}`, { actionComplete: true, teamReady: true });
    assert.equal(session.ready(), true);
    assert.deepEqual([...session.storage.keys()], [`momey-a3:seat:${session.roleId}`]);
    const nextRole = session.roleId === "3" ? "1" : String(Number(session.roleId) + 1);
    assert.equal(session.storage.get(`momey-a3:seat:${nextRole}`), undefined, "isolated session must not infer another seat");
  }
});

test("limited verification keeps A/B as draft then confirm, with no result before confirmation", () => {
  const app = read("assets/app.js");
  assert.ok(app.includes("verificationDraft"));
  assert.ok(app.includes("verificationConfirmed"));
  assert.ok(app.includes("verificationResult"));
  assert.match(app, /const result = confirmed \?/);
  assert.match(app, /if \(shared\.verificationDraft && !shared\.verificationConfirmed\)/);
  assert.match(app, /data-verify-confirm/);
  assert.ok(app.includes("西側路線掃描"));
  assert.ok(app.includes("東閘載重測試"));
});

test("all four A/B by close/hold branches remain reachable and consequence does not reset", () => {
  const app = read("assets/app.js");
  for (const key of ["A|close", "A|hold", "B|close", "B|hold"]) assert.ok(app.includes(`"${key}"`), `missing branch ${key}`);
  for (const phrase of ["西側推車路線被切斷", "替代進入路線到達前，她失去生命", "救援推車沿可通軌道清出西側路線", "高承留到控制廊隔離完成", "finalDraft", "finalConfirmed", "consequence"]) assert.ok(app.includes(phrase), `branch marker missing: ${phrase}`);
});

test("reset removes only A3 storage prefix and does not touch infrastructure", () => {
  const app = read("assets/app.js");
  assert.ok(app.includes('const STORAGE_PREFIX = "momey-a3:"'));
  assert.ok(app.includes("Object.keys(store).filter((key) => key.startsWith(STORAGE_PREFIX))"));
  const storage = new Map([["momey-a3:seat:1", "x"], ["momey-a3:shared", "y"], ["momey-a2:shared", "keep"], ["other", "keep"]]);
  [...storage.keys()].filter((key) => key.startsWith("momey-a3:")).forEach((key) => storage.delete(key));
  assert.equal(storage.has("momey-a2:shared"), true);
  assert.equal(storage.has("other"), true);
  assert.equal(storage.size, 2);
});

test("mobile guardrails, protected paths, and infrastructure boundary hold", () => {
  const source = htmlFiles.map(read).join("\n") + read("assets/app.js") + read("assets/styles.css");
  for (const forbidden of ["fetch(", "WebSocket", "gtag", "Google Analytics", "D1", "Cloudflare", "Threads", "Portaly", "payment", "account"]) assert.equal(source.includes(forbidden), false, `forbidden infrastructure marker: ${forbidden}`);
  const css = read("assets/styles.css");
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /@media\s*\(max-width:\s*660px\)/);
  assert.match(css, /\.pressure-range/);

  const protectedPaths = ["playable-a1", "index.html", "script.js", "styles.css", "sr-h1", "sr-h2", "sr-h3", "sr-assets", "worker", ".wrangler", "GA4"];
  const diff = spawnSync("git", ["diff", "--quiet", "HEAD", "--", ...protectedPaths], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(diff.status, 0, diff.stderr || "protected-path diff failed");
  const status = spawnSync("git", ["status", "--short", "--untracked-files=all", "--", ...protectedPaths], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(status.status, 0, status.stderr || "protected-path status failed");
  assert.equal(status.stdout.trim(), "", `protected paths changed:\n${status.stdout}`);
});
