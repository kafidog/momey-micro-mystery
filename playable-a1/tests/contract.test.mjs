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

const index = read("index.html");
for (const href of ["seat-1.html", "seat-2.html", "seat-3.html"]) assert.match(index, new RegExp(`href=["']${href}["']`), `${href} linked from entry`);
assert.match(index, /Momey — Early Playable Prototype/);
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
assert.match(app, /const stageLabels = \["準備", "私密", "交換", "重構", "查證", "共識", "後果"\]/, "seven stage labels");
assert.match(app, /target > 6/, "stage engine caps at stage 6");
assert.match(app, /仍可信但未校驗/, "unselected verification remains credible but unverified");

for (const name of seatFiles) {
  const source = read(name);
  assert.match(source, /assets\/styles\.css/);
  assert.match(source, /assets\/app\.js/);
  assert.match(source, /data-playable-a1/);
  assert.match(source, /data-stage-panel="0"/);
  for (const stage of [1, 2, 3, 4, 5, 6]) assert.match(source, new RegExp(`data-stage-panel="${stage}"`), `${name} stage ${stage}`);
  assert.match(source, /data-action="choose-verification"/);
  assert.match(source, /data-choice="A"/);
  assert.match(source, /data-choice="B"/);
  assert.match(source, /data-action="choose-commitment"/);
  assert.match(source, /data-commitment="seal"/);
  assert.match(source, /data-commitment="delay"/);
  assert.match(source, /data-verbal-consensus/);
  assert.match(source, /人員訊號先說[\s\S]*封鎖風險再說[\s\S]*事件指揮最後重述/, `${name} oral anti-alpha sequence`);
  assert.match(source, /階段 [0-6]/, `${name} Traditional Chinese stage labels`);
  assert.doesNotMatch(source, /開始個人 briefing|containment 假設|MOMEY \/ PLAYABLE A1/, `${name} UI copy fidelity`);
  assert.match(source, /data-action="reset-open"/);
  assert.match(source, /data-action="reset-confirm"/);
}

const s1 = read("seat-1.html");
const s2 = read("seat-2.html");
const s3 = read("seat-3.html");
assert.match(s1, /合法進入 Sector C/);
assert.match(s1, /07:19[\s\S]{0,220}沒有 P 的確認離場/);
assert.match(s2, /relay checksum|暫時與 P 的通道及位置 C 關聯/);
assert.match(s3, /感測器校準與模型可靠度尚未驗證|可靠度尚未驗證/);
assert.match(s2, /查證結果 A[\s\S]*data-fragment-id="s2-a"|data-fragment-id="s2-a"/);
assert.match(s3, /查證結果 B[\s\S]*data-fragment-id="s3-b"|data-fragment-id="s3-b"/);
assert.doesNotMatch(s1, /穿戴裝置上的異常|壓差正在朝下游/);
assert.doesNotMatch(s2, /07:14 的事件檔|壓差正在朝下游/);
assert.doesNotMatch(s3, /穿戴裝置上的異常|07:14 的事件檔/);

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

console.log("PLAYABLE_A1_CONTRACT_PASS", { htmlFiles: htmlFiles.length, seatFiles: seatFiles.length, stages: 7 });
