import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const routeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(routeRoot, "..");
const read = (relative) => fs.readFileSync(path.join(routeRoot, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(routeRoot, relative));

const htmlFiles = ["index.html", "role-1.html", "role-2.html", "role-3.html"];
const roleFiles = ["role-1.html", "role-2.html", "role-3.html"];
const protectedPaths = [
  "playable-a1",
  "index.html",
  "script.js",
  "styles.css",
  "sr-h1",
  "sr-h2",
  "sr-h3",
  "sr-assets",
  "worker",
  ".wrangler"
];
const reviewDocNames = [
  "00_A2_OVERVIEW.md",
  "01_A2_DESIGN_RESET.md",
  "02_COMMON_STORY_AND_COMIC.md",
  "03_CHARACTER_AND_ROLE_MODEL.md",
  "04_INFORMATION_SHARING_RULES.md",
  "05_ROLE_ACTIONS.md",
  "06_PLAYER_INFORMATION_MATRIX.md",
  "07_STAGE_FLOW.md",
  "08_LIMITED_VERIFICATION.md",
  "09_DECISION_CONSEQUENCE_MAP.md",
  "10_FULL_SHARING_STRESS_TEST.md",
  "11_SYNTHETIC_PLAYTHROUGH.md",
  "12_SOL_HIGH_ADVERSARIAL_REVIEW.md",
  "13_DEFECT_REPORT.md",
  "14_PLAYTEST_INSTRUCTIONS.md",
  "15_KNOWN_LIMITATIONS.md",
  "16_AGENT_EXECUTION_RECORD.md",
  "17_A1_2_TO_A2_CHANGE_REVIEW.md",
  "18_LOGICAL_INFORMATION_ARCHITECTURE.md",
  "19_COPY_INVENTORY.md"
];

const modelSeatKey = (roleId) => `momey-a2:seat:${roleId}`;
const createIsolatedSession = (roleId) => ({ roleId, storage: new Map() });
const modelCanReachVerification = (session) => {
  const seat = session.storage.get(modelSeatKey(session.roleId));
  return seat?.actionComplete === true && seat?.teamReady === true;
};

test("A2 required route files and six optimized storyboard panels exist", () => {
  const required = [
    ...htmlFiles,
    "assets/styles.css",
    "assets/app.js",
    "tests/contract.test.mjs",
    "README.md",
    "STORYBOARD_INDEX.md",
    "SCREENSHOT_INDEX.md",
    ...reviewDocNames,
    ...Array.from({ length: 6 }, (_, index) => `assets/storyboard/panel-${String(index + 1).padStart(2, "0")}.webp`)
  ];
  for (const file of required) assert.equal(exists(file), true, `missing ${file}`);
  for (const panel of Array.from({ length: 6 }, (_, index) => `assets/storyboard/panel-${String(index + 1).padStart(2, "0")}.webp`)) {
    assert.ok(fs.statSync(path.join(routeRoot, panel)).size > 10000, `${panel} is unexpectedly small`);
  }
});

test("shared prologue answers story comprehension questions from index only", () => {
  const index = read("index.html");
  for (const answer of ["海岬防洪站", "西側維修隧道", "中央控制廊", "東閘", "18:40", "18:47", "18:48", "林芮", "高承", "主電力", "中央遙測", "一個高能診斷脈衝", "立即封閉", "維持 95 秒", "你們是同一隊。知道的都可以說；每個人能做的事不同。"]) {
    assert.ok(index.includes(answer), `index is missing story answer: ${answer}`);
  }
  assert.equal(index.match(/class="story-panel(?: story-panel-final)?"/g)?.length, 6, "the common prologue must contain six panels");
});

test("six storyboard images match their causal headings and captions in exact order", () => {
  const index = read("index.html");
  const panelBlocks = [...index.matchAll(/<figure class="story-panel(?: story-panel-final)?">([\s\S]*?)<\/figure>/g)].map((match) => match[1]);
  const expectedPanels = [
    {
      file: "panel-01.webp",
      heading: "18:40｜人員就位",
      markers: ["海岬防洪站", "林芮", "高承", "主電力與中央遙測都正常"]
    },
    {
      file: "panel-02.webp",
      heading: "18:47｜進水管破裂",
      markers: ["海水進水管突然破裂", "主電力與中央遙測同時失效", "控制廊"]
    },
    {
      file: "panel-03.webp",
      heading: "西側｜林芮失聯",
      markers: ["林芮在水霧後失去聯絡", "沒有確認西側出口", "穿戴頻道", "救援推車"]
    },
    {
      file: "panel-04.webp",
      heading: "東閘｜壓力逼近",
      markers: ["高承必須留在手動撐架", "控制廊保持隔離", "撐架能承受多久仍不清楚"]
    },
    {
      file: "panel-05.webp",
      heading: "18:48｜你們接手",
      markers: ["你們三人是同一支事故應變小組", "三支手機", "三端資訊"]
    },
    {
      file: "panel-06.webp",
      heading: "只剩一次查證",
      markers: ["一個高能診斷脈衝", "西側路線或東閘承載", "立即封閉", "維持 95 秒"]
    }
  ];

  assert.equal(panelBlocks.length, expectedPanels.length, "storyboard must contain six ordered panel blocks");
  expectedPanels.forEach((expected, indexPosition) => {
    const block = panelBlocks[indexPosition];
    assert.ok(block.includes(`assets/storyboard/${expected.file}`), `panel ${indexPosition + 1} has the wrong image filename`);
    assert.ok(block.includes(`<strong>${expected.heading}</strong>`), `${expected.file} has the wrong heading`);
    for (const marker of expected.markers) assert.ok(block.includes(marker), `${expected.file} is missing causal marker: ${marker}`);
  });
  assert.equal(panelBlocks[1].includes("原本正常"), false, "panel-02 rupture image must not be described as normal");
  assert.equal(panelBlocks[2].includes("18:40"), false, "panel-03 post-rupture image must not be placed at 18:40");
});

test("three role pages use the same semantic template and distinct capabilities", () => {
  const labels = ["共同情勢", "你的職責", "現在已知", "還不知道", "你可以做"];
  const keys = [];
  for (const file of roleFiles) {
    const source = read(file);
    for (const label of labels) assert.ok(source.includes(label), `${file} is missing ${label}`);
    const key = source.match(/data-action-key="([^"]+)"/)?.[1];
    assert.ok(key, `${file} is missing a unique action key`);
    keys.push(key);
    for (const evidenceLabel of ["來源", "時間", "內容", "還不能確定"]) assert.ok(source.includes(evidenceLabel), `${file} is missing evidence label ${evidenceLabel}`);
  }
  assert.deepEqual(new Set(keys).size, 3, "role capabilities must be distinct");
  const app = read("assets/app.js");
  for (const key of ["command-cache", "wearable-query", "pressure-waveform"]) assert.ok(app.includes(key), `app is missing ${key}`);
});

test("role actions have fixed-truth result boundaries and preserve open sharing", () => {
  const app = read("assets/app.js");
  for (const phrase of [
    "遠端封閉需要 20 秒",
    "救援推車從授權到清出西側路線需要 95 秒",
    "刻意做出的兩點回應",
    "即時回應還是緩衝資料",
    "壓力前緣會在這段時間內抵達東閘",
    "高承必須留在撐點",
    "東閘撐架能不能承受完整的 95 秒"
  ]) assert.ok(app.includes(phrase), `role result boundary missing: ${phrase}`);
  assert.ok(app.includes("把你知道的說出來。你們認為現在最大的未知是什麼？"));
  assert.ok(app.includes("verificationDraft"));
  assert.ok(app.includes("verificationConfirmed"));
  assert.ok(app.includes("verificationResult"));
  assert.ok(app.includes("finalDraft"));
  assert.ok(app.includes("finalConfirmed"));
  assert.ok(app.includes("consequence"));
  assert.ok(app.includes("三個角色都完成操作，也把結果說給彼此了"));
});

test("limited verification is two-option, one-confirmation, and result-hidden-before-confirm", () => {
  const app = read("assets/app.js");
  for (const phrase of ["西側路線掃描", "東閘載重測試", "剩餘電容只能打一個高能脈衝", "data-verification-result", "確認這次唯一查證", "已確認唯一查證"]) {
    assert.ok(app.includes(phrase), `verification contract missing: ${phrase}`);
  }
  assert.match(app, /const resultHtml = confirmed\s*\?/, "verification result is rendered only after confirmation");
  assert.match(app, /verificationConfirmed: option\.key/, "confirmed verification is stored separately");
  assert.match(app, /data-verify-option/, "both options are interactive choices");
});

test("all four verification/final branches are reachable and share fixed physical truth", () => {
  const app = read("assets/app.js");
  for (const branch of ["A|close", "A|hold", "B|close", "B|hold"]) assert.ok(app.includes(`"${branch}"`), `missing branch ${branch}`);
  for (const phrase of [
    "西側推車路線被切斷",
    "替代進入路線到達前，她失去生命",
    "救援推車沿可通軌道清出西側路線",
    "他在東閘撐架失效中死亡",
    "高承留在撐點直到控制廊隔離完成"
  ]) assert.ok(app.includes(phrase), `branch consequence missing: ${phrase}`);
});

test("refresh, reset, and per-seat isolation are implemented locally", () => {
  const app = read("assets/app.js");
  assert.ok(app.includes('const STORAGE_PREFIX = "momey-a2:"'));
  assert.ok(app.includes("localStorage"));
  assert.ok(app.includes("Object.keys(store).filter((key) => key.startsWith(STORAGE_PREFIX))"));
  assert.ok(app.includes("seat:${roleId}"));
  assert.ok(app.includes("window.addEventListener(\"storage\""));
  assert.ok(app.includes("actionComplete"));
  assert.ok(app.includes("actionAt"));
  assert.ok(app.includes("teamReady"));
  assert.ok(app.includes("teamReadyAt"));
  assert.ok(app.includes("finalDraft"));
  assert.ok(app.includes("finalConfirmed"));
});

test("three isolated phone sessions require own action and local spoken-sharing confirmation", () => {
  const app = read("assets/app.js");
  assert.match(
    app,
    /function currentSessionReady\(\)\s*{[\s\S]*?seat\.actionComplete === true && seat\.teamReady === true;/,
    "runtime readiness must use the current role's own action and local teamReady state"
  );
  assert.ok(app.includes('data-team-ready'), "runtime is missing the explicit local readiness control");
  assert.ok(app.includes("這支手機不會偵測其他裝置"), "runtime must explain that readiness is not remotely detected");
  assert.ok(app.includes('<span class="ledger-state">需要聽到</span>'), "contribution ledger must describe requirements, not remote status");
  assert.equal(app.includes("function allActionsComplete"), false, "runtime must not require all seat keys in one storage profile");
  assert.equal(app.includes("completedCount"), false, "runtime must not compute a false cross-device completion count");
  assert.doesNotMatch(
    app,
    /ROLE_IDS\.every\([\s\S]{0,160}readSeat/,
    "runtime must not inspect all three seat keys as a verification prerequisite"
  );

  const sessions = ["1", "2", "3"].map(createIsolatedSession);
  for (const session of sessions) {
    assert.equal(modelCanReachVerification(session), false, `role ${session.roleId} reached verification without its own action`);

    session.storage.set(modelSeatKey(session.roleId), { actionComplete: false, teamReady: true });
    assert.equal(modelCanReachVerification(session), false, `role ${session.roleId} reached verification with teamReady only`);

    session.storage.set(modelSeatKey(session.roleId), { actionComplete: true, teamReady: false });
    assert.equal(modelCanReachVerification(session), false, `role ${session.roleId} reached verification with actionComplete only`);

    session.storage.set(modelSeatKey(session.roleId), { actionComplete: true, teamReady: true });
    assert.equal(modelCanReachVerification(session), true, `role ${session.roleId} could not reach verification after both local gates`);
    assert.deepEqual(
      [...session.storage.keys()],
      [modelSeatKey(session.roleId)],
      `role ${session.roleId} should need only its own seat key in its isolated storage`
    );

    const originalRole = session.roleId;
    session.roleId = originalRole === "3" ? "1" : String(Number(originalRole) + 1);
    assert.equal(modelCanReachVerification(session), false, `switching from role ${originalRole} bypassed the new role's own action`);
    session.roleId = originalRole;
  }
  assert.notEqual(sessions[0].storage, sessions[1].storage, "role 1 and role 2 must use isolated storage models");
  assert.notEqual(sessions[1].storage, sessions[2].storage, "role 2 and role 3 must use isolated storage models");
});

test("mobile guardrails and no artificial withholding language exist in player source", () => {
  const source = htmlFiles.map(read).join("\n") + read("assets/app.js") + read("assets/styles.css");
  for (const forbidden of ["不要照念", "不可展示", "我知道但我不能說", "你贏", "你輸", "好結局", "壞結局"]) {
    assert.equal(source.includes(forbidden), false, `forbidden player-facing phrase found: ${forbidden}`);
  }
  const css = read("assets/styles.css");
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /@media\s*\(max-width:\s*660px\)/);
});

test("A2 route does not reference protected acquisition/runtime infrastructure", () => {
  const source = htmlFiles.map(read).join("\n") + read("assets/app.js") + read("assets/styles.css");
  for (const forbidden of ["fetch(", "WebSocket", "gtag", "Google Analytics", "D1", "Cloudflare", "Threads", "Portaly"]) {
    assert.equal(source.includes(forbidden), false, `protected infrastructure reference found: ${forbidden}`);
  }
  const diff = spawnSync("git", ["diff", "--quiet", "HEAD", "--", ...protectedPaths], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(diff.status, 0, diff.stderr || "protected-path git diff failed");
  const status = spawnSync("git", ["status", "--short", "--untracked-files=all", "--", ...protectedPaths], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(status.status, 0, status.stderr || "protected-path git status failed");
  assert.equal(status.stdout.trim(), "", `protected paths changed relative to repo root:\n${status.stdout}`);
});

test("role-action removal logic is documented as a material loss", () => {
  const doc = read("05_ROLE_ACTIONS.md");
  for (const phrase of ["移除事件指揮行動", "20 秒", "95 秒", "移除救援聯絡行動", "兩點回應", "移除結構安全行動", "東閘撐點"]) {
    assert.ok(doc.includes(phrase), `removal test documentation missing: ${phrase}`);
  }
});
