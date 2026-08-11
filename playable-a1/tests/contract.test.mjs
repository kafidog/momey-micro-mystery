import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repo = path.resolve(root, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const htmlFiles = ["index.html", "seat-1.html", "seat-2.html", "seat-3.html"];
const seatFiles = ["seat-1.html", "seat-2.html", "seat-3.html"];
const sourceFiles = [...htmlFiles, "assets/app.js", "assets/styles.css"];
const requiredDocs = [
  "README.md",
  ...Array.from({ length: 13 }, (_, index) => `${String(index).padStart(2, "0")}_${[
    "PLAYABLE_OVERVIEW",
    "FIXED_TRUTH",
    "PLAYER_INFORMATION_MATRIX",
    "STAGE_FLOW",
    "LIMITED_VERIFICATION_DESIGN",
    "DECISION_CONSEQUENCE_MAP",
    "SEAT_RESPONSIBILITY",
    "SYNTHETIC_PLAYTHROUGH",
    "DEFECT_REPORT",
    "SOL_HIGH_ADVERSARIAL_REVIEW",
    "PLAYTEST_INSTRUCTIONS",
    "KNOWN_LIMITATIONS",
    "AGENT_EXECUTION_RECORD"
  ][index]}.md`),
  "13_A1_1_TO_A1_2_CHANGE_REVIEW.md",
  "SOURCE_SNAPSHOT.md",
  "SCREENSHOT_INDEX.md"
];

for (const name of htmlFiles) assert.ok(fs.existsSync(path.join(root, name)), `${name} exists`);
for (const name of requiredDocs) {
  assert.ok(fs.existsSync(path.join(root, name)), `${name} exists`);
  assert.match(read(name), /A1\.2/, `${name} is versioned A1.2`);
}
assert.ok(fs.existsSync(path.join(root, "assets", "app.js")), "shared app exists");
assert.ok(fs.existsSync(path.join(root, "assets", "styles.css")), "shared styles exist");
assert.ok(!fs.existsSync(path.join(root, "13_A1_TO_A1_1_CHANGE_REVIEW.md")), "obsolete A1.1 review artifact removed");

const index = read("index.html");
for (const href of ["seat-1.html", "seat-2.html", "seat-3.html"]) {
  assert.match(index, new RegExp(`href=["']${href}["']`), `${href} linked from entry`);
}
assert.match(index, /Playable A1\.2/);
assert.match(index, /3 位玩家/);
assert.match(index, /每人一支手機/);
assert.match(index, /免安裝/);
assert.match(index, /無共用螢幕/);
assert.doesNotMatch(index, /未宣傳|完成品|Game01|商業發行|沒有分數|沒有正解|設計者|公平|author|fairness/i, "entry has no player-facing meta copy");

const app = read("assets/app.js");
assert.doesNotMatch(app, /gtag|googletagmanager|GA4|collector|D1|sr-assets|fetch\s*\(/i, "shared JS has no acquisition/analytics transport");
assert.match(app, /momey-playable-a1:/);
assert.match(app, /localStorage\.setItem/);
assert.match(app, /localStorage\.removeItem/);
assert.match(app, /recontextConfirmed/);
assert.match(app, /verificationDraft/);
assert.match(app, /verificationConfirmed/);
assert.match(app, /data-action='confirm-verification'/);
assert.match(app, /resultCards\.forEach\(\(card\) => \{[\s\S]*?!state\.verificationConfirmed/);
assert.match(app, /button\.disabled = state\.stage !== 4 \|\| state\.verificationConfirmed/);
const draftSwitchGuard = app.match(/const nextVerificationDraft[\s\S]*?state\.verificationDraft = nextVerificationDraft;[\s\S]*?render\(\);/)?.[0] || "";
assert.match(draftSwitchGuard, /state\.verificationDraft !== nextVerificationDraft/);
assert.match(draftSwitchGuard, /verificationConsensus\.checked = false/);
assert.match(draftSwitchGuard, /saveState\(\)/);
assert.match(draftSwitchGuard, /render\(\)/, "draft switch clears stale consent before re-render");
assert.match(app, /const stageLabels = \["準備", "私密", "交換", "發現", "查證", "共識", "後果"\]/, "seven A1.2 stage labels");
assert.match(app, /target > 6/, "stage engine caps at stage 6");
assert.doesNotMatch(app, /三輪口頭|輪／人員訊號|輪／封鎖風險|先讓另外兩席說完/, "old scripted protocol removed from shared app");

const stripMarkup = (source) => source
  .replace(/<(head|script|style)\b[\s\S]*?<\/\1>/gi, " ")
  .replace(/<[^>]*>/g, " ");
const segmenter = new Intl.Segmenter("zh-Hant", { granularity: "word" });
const visibleWordCount = (source) => [...segmenter.segment(stripMarkup(source))].filter((part) => part.isWordLike).length;
const counts = Object.fromEntries(seatFiles.map((name) => [name, visibleWordCount(read(name))]));
for (const [name, count] of Object.entries(counts)) {
  assert.ok(count < 800, `${name} player-facing count ${count} < 800`);
  assert.ok(count <= 750, `${name} player-facing count ${count} is not above the 750 warning threshold`);
}

const panel = (source, stage) => source.match(new RegExp(`data-stage-panel="${stage}"[\\s\\S]*?(?=data-stage-panel="${stage + 1}")`))?.[0] || "";
const stage3AnswerLeak = /無法報告|不等於|Sector C 沒有人|確認服務現在|證明.*沒有人|物理真相/;
const preCommitment = (source) => `${panel(source, 1)}${panel(source, 2)}`;

for (const name of seatFiles) {
  const source = read(name);
  assert.match(source, /assets\/styles\.css/);
  assert.match(source, /assets\/app\.js/);
  assert.match(source, /data-playable-a1/);
  assert.match(source, /Playable A1\.2/);
  assert.doesNotMatch(source, /Playable A1\.1|未宣傳|完成品|Game01|商業發行|沒有分數|沒有正解|這不是好結局|設計者|公平/i, `${name} has no stale/player-facing meta copy`);
  for (const stage of [0, 1, 2, 3, 4, 5, 6]) assert.match(source, new RegExp(`data-stage-panel="${stage}"`), `${name} stage ${stage}`);
  assert.match(source, /data-recontext-check/);
  assert.match(source, /data-action="confirm-recontext"/);
  assert.match(source, /data-recontext-definition hidden><\/div>/, `${name} starts with an empty Stage 3 definition container`);
  const stage3 = panel(source, 3);
  assert.match(stage3, /0 已確認人員/);
  assert.match(stage3, /這行能回答什麼/);
  assert.doesNotMatch(stage3.slice(0, stage3.indexOf("data-recontext-definition")), stage3AnswerLeak, `${name} Stage 3 pre-reveal has no answer leakage`);
  const stage4 = panel(source, 4);
  assert.match(stage4, /data-action="choose-verification"/);
  assert.match(stage4, /data-choice="A"/);
  assert.match(stage4, /data-choice="B"/);
  assert.match(stage4, /data-verification-consensus/);
  assert.match(stage4, /三人都確認選同一項了嗎？/);
  assert.match(stage4, /data-action="confirm-verification"/);
  assert.equal((stage4.match(/data-verification-result=/g) || []).length, 2, `${name} has two gated result cards`);
  const stage5 = panel(source, 5);
  assert.equal((stage5.match(/data-private-prompt/g) || []).length, 1, `${name} has one private Stage 5 prompt`);
  assert.match(stage5, /自由談/);
  assert.doesNotMatch(stage5, /先讓另外兩席說完|三輪口頭|輪／|checklist|逐一/, `${name} has no scripted Stage 5 order`);
  assert.match(source, /data-action="choose-commitment"/);
  assert.match(source, /data-commitment="seal"/);
  assert.match(source, /data-commitment="delay"/);
  assert.match(source, /data-verbal-consensus/);
  assert.match(source, /data-action="reset-open"/);
  assert.match(source, /data-action="reset-confirm"/);
  assert.equal((source.match(/data-fragment-id="/g) || []).length, 2, `${name} has two private verification fragments`);
  assert.match(source, /永久呼吸傷害/);
  assert.match(source, /永久離開現場值勤/, `${name} preserves permanent field-duty removal`);
}

const s1 = read("seat-1.html");
const s2 = read("seat-2.html");
const s3 = read("seat-3.html");
const s1Pre = preCommitment(s1);
const s2Pre = preCommitment(s2);
const s3Pre = preCommitment(s3);
assert.match(s1Pre, /合法進入 Sector C/);
assert.match(s1Pre, /07:19[\s\S]*沒有 P 的確認離場/);
assert.match(s1Pre, /07:20–07:23/);
assert.match(s1Pre, /Q 在下游第二道門/);
assert.doesNotMatch(s1Pre, /不可逆|永久呼吸|污染前緣靠近/);
assert.match(s2Pre, /人類生理訊號/);
assert.match(s2Pre, /07:19 後/);
assert.doesNotMatch(s2Pre, /Q|不可逆|永久呼吸|身體後果/);
assert.match(s3Pre, /Q/);
assert.match(s3Pre, /第二道門/);
assert.match(s3Pre, /07:20–07:23/);
assert.match(s3Pre, /不可逆的身體後果/);
assert.doesNotMatch(s3Pre, /永久呼吸傷害/);

assert.match(s1, /你的第二張卡/);
assert.match(s2, /你的第二張卡/);
assert.match(s3, /你的第二張卡/);
assert.match(s1, /data-fragment-id="s1-a"/);
assert.match(s1, /data-fragment-id="s1-b"/);
assert.match(s2, /data-fragment-id="s2-a"/);
assert.match(s2, /data-fragment-id="s2-b"/);
assert.match(s3, /data-fragment-id="s3-a"/);
assert.match(s3, /data-fragment-id="s3-b"/);
assert.match(s1, /提醒：時間窗口和站位/);
assert.match(s2, /提醒：P 的訊號/);
assert.match(s3, /提醒：Q 還在門前/);

const fragmentTitles = seatFiles.flatMap((name) => {
  const source = read(name);
  return [...source.matchAll(/data-fragment-id="[^"]+"[\s\S]*?<h3>([^<]+)<\/h3>/g)].map((match) => match[1]);
});
assert.equal(fragmentTitles.length, 6, "six seat-specific verification fragments");
assert.equal(new Set(fragmentTitles).size, 6, "verification fragment headings are distinct");

const styles = read("assets/styles.css");
assert.match(styles, /@media \(max-width: 560px\)[\s\S]*?\.stage-nav[\s\S]*?overflow-x: hidden/, "mobile stage nav hides internal overflow");
assert.match(styles, /@media \(max-width: 560px\)[\s\S]*?\.stage-list[\s\S]*?min-width: 0[\s\S]*?grid-template-columns: repeat\(7, minmax\(0, 1fr\)\)/, "mobile stage nav fits seven markers");

for (const name of sourceFiles) {
  const source = read(name);
  assert.doesNotMatch(source, /https?:\/\/|window\.fetch|navigator\.sendBeacon|gtag|googletagmanager|D1|sr-assets/i, `${name} isolated source boundary`);
}

const status = execFileSync("git", ["status", "--short", "--untracked-files=all"], { cwd: repo, encoding: "utf8" });
const changedPaths = status.split(/\r?\n/).filter(Boolean).map((line) => line.slice(3).trim().replaceAll("\\", "/"));
assert.ok(changedPaths.every((name) => name === "playable-a1" || name.startsWith("playable-a1/")), `write scope is playable-a1 only: ${changedPaths.join(", ")}`);
const protectedDiff = execFileSync("git", ["diff", "--name-only", "--", "index.html", "script.js", "styles.css", "sr-h1", "sr-h2", "sr-h3", "sr-assets"], { cwd: repo, encoding: "utf8" }).trim();
assert.equal(protectedDiff, "", "protected root/same-room files are unchanged");

console.log("PLAYABLE_A1_2_CONTRACT_PASS", {
  htmlFiles: htmlFiles.length,
  seatFiles: seatFiles.length,
  stages: 7,
  counts,
  copyWarningCount: 0,
  qTopology: "S1 station-only / S2 P-signal / S3 physical-Q dependency",
  discoveryGated: true,
  verificationTwoStep: true,
  protectedFiles: true
});
