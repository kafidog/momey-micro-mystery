import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const repo = path.resolve(root, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const app = read("assets/app.js");
const css = read("assets/styles.css");
const pages = ["index.html", "role-1.html", "role-2.html", "role-3.html"];
const html = Object.fromEntries(pages.map((file) => [file, read(file)]));
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function loadRuntime(url = "https://example.test/playable-a6/index.html?seed=ALPHA2") {
  const store = new Map();
  const document = { body: { dataset: { page: "test" } }, addEventListener() {}, querySelector() { return null; } };
  const location = new URL(url);
  const localStorage = {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); },
    key(index) { return Array.from(store.keys())[index] ?? null; },
    get length() { return store.size; }
  };
  const context = { window: { location, history: { replaceState() {} }, localStorage, crypto: globalThis.crypto, setTimeout, addEventListener() {}, MomeyA6: null }, document, URL, URLSearchParams, Uint8Array, Math, Object, String, JSON, console, navigator: {} };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(app, context);
  return { api: context.window.MomeyA6, store, context };
}

test("A6 is four isolated static pages", () => {
  for (const file of pages) assert.ok(fs.existsSync(path.join(root, file)), file + " missing");
  assert.match(html["index.html"], /MOMEY A6｜海岬防洪站/);
  for (const role of ["1", "2", "3"]) {
    assert.match(html["role-" + role + ".html"], new RegExp("data-role=\"" + role + "\""));
    assert.match(html["role-" + role + ".html"], /assets\/app\.js/);
  }
  assert.equal(fs.existsSync(path.join(root, "package.json")), false);
});

test("A5 storyboard art is reused byte-for-byte", () => {
  for (let i = 1; i <= 6; i += 1) {
    const name = "panel-0" + i + ".webp";
    assert.equal(sha(path.join(root, "assets", "storyboard", name)), sha(path.join(repo, "playable-a5", "assets", "storyboard", name)), name);
  }
});

test("runtime is isolated and has no forbidden infrastructure", () => {
  assert.match(app, /var VERSION = "momey-a6:"/);
  for (const forbidden of ["fetch(", "WebSocket", "EventSource", "gtag", "Google Analytics", "Cloudflare", "D1", "payment", "account", "localStorage.clear(", "SpeechRecognition", "webkitSpeechRecognition"]) assert.equal(app.includes(forbidden), false, forbidden);
});

test("operator is fully scripted and exposes no free-text input", () => {
  const { api } = loadRuntime();
  assert.equal(Array.isArray(api.dialogue), true);
  assert.ok(api.dialogue.length >= 20);
  assert.equal(Object.keys(html).some((key) => /<textarea|<input[^>]+type=["']?text/i.test(html[key])), false);
  assert.equal(app.includes("prompt("), false);
  assert.equal(app.includes("contenteditable"), false);
});

test("every operator row has the complete authored schema", () => {
  const { api } = loadRuntime();
  const fields = ["DIALOGUE_ID", "STAGE", "AUDIENCE", "PROFILE", "TRIGGER", "TEXT", "VOICE", "SFX", "KNOWLEDGE_SOURCE", "FOLLOWUP"];
  for (const row of api.dialogue) {
    for (const field of fields) assert.notEqual(row[field], undefined, row.DIALOGUE_ID + ":" + field);
    assert.ok(row.TEXT.length > 0);
  }
  assert.equal(new Set(api.dialogue.map((row) => row.DIALOGUE_ID)).size, api.dialogue.length);
});

test("three human roles are peers and Command custody is gone", () => {
  const { api } = loadRuntime();
  assert.deepEqual(Object.values(api.roles).map((r) => r.name), ["作業時序", "救援聯絡", "結構安全"]);
  for (const forbidden of ["事件指揮", "指揮只負責", "host", "leader", "主持人", "最後按鈕擁有者"]) assert.equal(app.includes(forbidden), false, forbidden);
});

test("each role owns exactly one slot with two meaningful options", () => {
  const { api } = loadRuntime();
  const expected = [["O1", "O2"], ["R1", "R2"], ["S1", "S2"]];
  Object.values(api.roles).forEach((role, index) => assert.deepEqual(Array.from(role.options, (x) => x.key), expected[index]));
  assert.match(app, /diagnosticDraft/);
  assert.match(app, /diagnosticConfirmed/);
  assert.match(app, /另一項角色診斷本次不再開放/);
});

test("global team A/B verification is deprecated", () => {
  for (const marker of ["verificationChoices", "verificationDraft", "verificationConfirmed", "data-verify-option", "TEAM CHOOSES ONE"]) assert.equal(app.includes(marker), false, marker);
});

test("same normalized seed yields one profile and both profiles are reachable", () => {
  const { api } = loadRuntime();
  assert.equal(api.normalizeSeed("ab-c 12!!"), "ABC12");
  const one = api.deriveProfile("ALPHA2");
  assert.equal(api.deriveProfile("alpha-2"), one);
  const seen = new Set();
  for (let i = 0; i < 100; i += 1) seen.add(api.deriveProfile("SEED" + i));
  assert.deepEqual([...seen].sort(), ["backwash", "breakline"]);
  for (const role of ["1", "2", "3"]) assert.match(api.stateKey("ALPHA2", role), /^momey-a6:ALPHA2:role:/);
});

test("two fixed profiles contain six results and two consequences", () => {
  const { api } = loadRuntime();
  assert.deepEqual(Object.keys(api.profiles).sort(), ["backwash", "breakline"]);
  for (const profile of Object.values(api.profiles)) {
    assert.deepEqual(Array.from(Object.keys(profile.results)).sort(), ["O1", "O2", "R1", "R2", "S1", "S2"]);
    assert.deepEqual(Array.from(Object.keys(profile.consequences)).sort(), ["close", "hold"]);
    for (const result of Object.values(profile.results)) assert.deepEqual(Array.from(Object.keys(result)).sort(), ["found", "means", "unknown"]);
  }
});

test("profiles are materially different, not cosmetic", () => {
  const { api } = loadRuntime();
  assert.match(api.profiles.breakline.results.R1.found, /4 秒前直接寫入/);
  assert.match(api.profiles.backwash.results.R1.found, /延遲 41 秒/);
  assert.match(api.profiles.breakline.results.S2.found, /失效/);
  assert.match(api.profiles.backwash.results.S2.found, /可承受 105–110 秒/);
  assert.match(api.profiles.breakline.consequences.close.later, /失去生命/);
  assert.match(api.profiles.backwash.consequences.close.later, /永久缺氧傷害/);
});

test("operator does not recommend or claim omniscience", () => {
  const { api } = loadRuntime();
  const text = api.dialogue.map((row) => row.TEXT).join("\n");
  for (const forbidden of ["建議你們選", "你們應該選", "正確答案", "最好的選擇", "我認為"]) assert.equal(text.includes(forbidden), false, forbidden);
  assert.match(app, /岬衛-7 不會補上答案/);
});

test("diagnostic result is hidden until confirmation and unchosen result is not rendered", () => {
  const resultFn = app.slice(app.indexOf("function resultStage"), app.indexOf("function decisionStage"));
  assert.match(resultFn, /if \(!state\.diagnosticConfirmed\) return ""/);
  assert.match(resultFn, /results\[state\.diagnosticConfirmed\]/);
  assert.equal(resultFn.includes("state.diagnosticDraft"), false);
});

test("final decision has draft, spoken agreement, confirm and fixed outcome", () => {
  for (const marker of ["finalDraft", "agreementSpoken", "finalConfirmed", "data-agreement-spoken", "data-final-confirm", "consequences[state.finalConfirmed]"]) assert.ok(app.includes(marker), marker);
});

test("voice is captioned, controllable and nonblocking", () => {
  const all = app + Object.values(html).join("");
  for (const marker of ["aria-live=\"polite\"", "data-audio-toggle", "data-mute", "data-replay-voice", "speechSynthesis.cancel()", "/^zh-TW$/i", "字幕與流程不受影響"]) assert.ok(all.includes(marker), marker);
  assert.match(app, /window\.AudioContext \|\| window\.webkitAudioContext/);
  assert.match(app, /0\.035/);
});

test("reset only clears the current A6 session", () => {
  assert.match(app, /safeStorageRemovePrefix\(VERSION \+ seed \+ ":"\)/);
  assert.equal(app.includes("localStorage.clear("), false);
  for (const version of ["a1", "a2", "a3", "a4", "a5"]) assert.equal(app.includes("momey-" + version + ":"), false);
});

test("mobile CSS covers readable type, touch targets and overflow", () => {
  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(css, /font-size: 16px/);
  assert.match(css, /min-height: 48px/);
  assert.match(css, /min-height: 50px/);
  assert.match(css, /overflow-x: clip/);
});

test("facts are shareable and consequence ends with one human question", () => {
  assert.match(html["index.html"], /相關資訊都可以分享/);
  assert.match(app, /把查到的和仍不知道的都說出來/);
  assert.equal((app.match(/class=\\"human-question\\"/g) || []).length, 1);
});
