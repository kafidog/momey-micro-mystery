import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const htmlFiles = ["index.html", "seat-1.html", "seat-2.html", "seat-3.html"];
const seatFiles = ["seat-1.html", "seat-2.html", "seat-3.html"];
const sourceFiles = [...htmlFiles, "assets/app.js", "assets/styles.css"];

for (const name of htmlFiles) assert.ok(fs.existsSync(path.join(root, name)), `${name} exists`);
assert.ok(fs.existsSync(path.join(root, "assets", "app.js")), "shared app exists");
assert.ok(fs.existsSync(path.join(root, "assets", "styles.css")), "shared styles exist");
assert.ok(fs.existsSync(path.join(root, "13_A1_TO_A1_1_CHANGE_REVIEW.md")), "A1.1 change review exists");

const index = read("index.html");
for (const href of ["seat-1.html", "seat-2.html", "seat-3.html"]) assert.match(index, new RegExp(`href=["']${href}["']`), `${href} linked from entry`);
assert.match(index, /Momey — Early Playable Prototype/);
assert.match(index, /Playable A1\.1/);
assert.match(index, /3 位玩家/);
assert.match(index, /每人一支手機/);
assert.match(index, /免安裝/);
assert.match(index, /無共用螢幕/);
assert.match(index, /未宣傳測試版/);
assert.doesNotMatch(index, /MOMEY \/ PLAYABLE A1|三人同室 playable slice|Unadvertised|finished|commercial|briefing|containment/i, "entry copy fidelity");

const app = read("assets/app.js");
assert.doesNotMatch(app, /gtag|googletagmanager|GA4|collector|D1|sr-assets|fetch\s*\(/i, "shared JS has no acquisition/analytics transport");
assert.match(app, /momey-playable-a1:/);
assert.match(app, /localStorage\.setItem/);
assert.match(app, /localStorage\.removeItem/);
assert.match(app, /recontextConfirmed/);
assert.match(app, /data-action='confirm-recontext'/);
assert.match(app, /const stageLabels = \["準備", "私密", "交換", "發現", "查證", "共識", "後果"\]/, "seven A1.1 stage labels");
assert.match(app, /target > 6/, "stage engine caps at stage 6");
assert.match(app, /仍可信，但還沒有被確認/, "unselected verification remains credible but unconfirmed");
assert.doesNotMatch(app, /三輪口頭|輪／人員訊號|輪／封鎖風險/, "old compliance-looking protocol removed from shared app");

for (const name of seatFiles) {
  const source = read(name);
  assert.match(source, /assets\/styles\.css/);
  assert.match(source, /assets\/app\.js/);
  assert.match(source, /data-playable-a1/);
  assert.match(source, /Playable A1\.1/);
  for (const stage of [0, 1, 2, 3, 4, 5, 6]) assert.match(source, new RegExp(`data-stage-panel="${stage}"`), `${name} stage ${stage}`);
  assert.match(source, /data-recontext-check/);
  assert.match(source, /data-action="confirm-recontext"/);
  assert.match(source, /data-recontext-definition hidden/);
  assert.match(source, /data-action="choose-verification"/);
  assert.match(source, /data-choice="A"/);
  assert.match(source, /data-choice="B"/);
  assert.match(source, /核對訊號是否真的來自 P/);
  assert.match(source, /核對延後會不會讓危險到達 Q/);
  assert.match(source, /data-action="choose-commitment"/);
  assert.match(source, /data-commitment="seal"/);
  assert.match(source, /data-commitment="delay"/);
  assert.match(source, /data-verbal-consensus/);
  assert.match(source, /自由討論/);
  assert.doesNotMatch(source, /relay checksum|裝置映射|入口稽核片段|模型可靠度|污染干擾與人員暴露邊界|三輪口頭協議/, `${name} A1.1 plain-language boundary`);
  assert.match(source, /不可逆|長期/);
  assert.match(source, /永久呼吸傷害/);
  assert.match(source, /永久離開現場值勤/);
  const consensus = source.match(/data-stage-panel="5"[\s\S]*?data-stage-panel="6"/)?.[0] || "";
  assert.match(consensus, /人員訊號席|封鎖風險席|事件指揮席/, `${name} Stage 5 Chinese role labels`);
  assert.doesNotMatch(consensus, /Seat [123]/, `${name} Stage 5 has no English seat labels`);
  assert.match(source, /data-action="reset-open"/);
  assert.match(source, /data-action="reset-confirm"/);
  assert.ok((source.match(/\bQ\b/g) || []).length >= 2, `${name} seeds Q before commitment`);
}

const s1 = read("seat-1.html");
const s2 = read("seat-2.html");
const s3 = read("seat-3.html");
assert.match(s1, /合法進入 Sector C/);
assert.match(s1, /07:19[\s\S]{0,220}沒有 P 的確認離場/);
assert.match(s1, /Q 值勤/);
assert.match(s2, /人類生理訊號/);
assert.match(s2, /Q 值勤/);
assert.match(s3, /第二道門前/);
assert.match(s3, /Q 的站位/);
assert.match(s1, /data-fragment-id="s1-a"/);
assert.match(s1, /data-fragment-id="s1-b"/);
assert.match(s2, /data-fragment-id="s2-a"/);
assert.match(s2, /data-fragment-id="s2-b"/);
assert.match(s3, /data-fragment-id="s3-a"/);
assert.match(s3, /data-fragment-id="s3-b"/);
assert.match(s1, /你的責任：只重述/);
assert.match(s2, /你的責任：先說 P 這一側/);
assert.match(s3, /你的責任：先說 Q 這一側/);

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

console.log("PLAYABLE_A1_1_CONTRACT_PASS", { htmlFiles: htmlFiles.length, seatFiles: seatFiles.length, stages: 7, qSeeded: true, discoveryGated: true });
