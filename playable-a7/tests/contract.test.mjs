import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const repo = path.resolve(root, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const app = read("assets/app.js");
const dialogueSource = read("assets/dialogue-data.js");
const css = read("assets/styles.css");
const mapSvg = read("assets/facility-map.svg");
const pages = ["index.html", "role-1.html", "role-2.html", "role-3.html"];
const html = Object.fromEntries(pages.map((file) => [file, read(file)]));
const manifest = JSON.parse(read("assets/audio/voice-manifest.json"));
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function loadRuntime({ url = "https://example.test/playable-a7/role-1.html?seed=A7-ALPHA", page = "role", role = "1" } = {}) {
  const store = new Map();
  const rootNode = { innerHTML: "" };
  const body = { getAttribute(name) { return name === "data-page" ? page : name === "data-role" ? role : null; } };
  const document = {
    body,
    addEventListener() {},
    querySelector(selector) { return selector === "[data-app]" ? rootNode : null; }
  };
  const location = new URL(url);
  const localStorage = {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); },
    key(index) { return Array.from(store.keys())[index] ?? null; },
    get length() { return store.size; }
  };
  const window = {
    location,
    localStorage,
    requestAnimationFrame(callback) { callback(); },
    scrollTo() {},
    addEventListener() {}
  };
  window.window = window;
  const context = { window, document, URL, URLSearchParams, Math, Object, String, JSON, console };
  vm.createContext(context);
  vm.runInContext(dialogueSource, context);
  vm.runInContext(app, context);
  return { api: window.__MOMEY_A7__, rootNode, store, window };
}

function roleState(overrides = {}) {
  return Object.assign({
    schema: "momey-a7-role-v1",
    seed: "A7-ALPHA",
    roleId: 1,
    profile: "breakline",
    stage: "ROLE",
    started: false,
    draft: null,
    confirmed: null,
    sharedOrally: false,
    decisionDraft: null,
    agreementConfirmed: false,
    decisionLocked: null,
    audioEnabled: true
  }, overrides);
}

test("A7 has four isolated static pages and required bounded assets", () => {
  for (const file of pages) assert.ok(fs.existsSync(path.join(root, file)), file);
  assert.match(html["index.html"], /MOMEY A7｜海岬防洪站/);
  for (const id of [1, 2, 3]) {
    const page = html[`role-${id}.html`];
    assert.match(page, new RegExp(`data-role="${id}"`));
    assert.match(page, /assets\/dialogue-data\.js/);
    assert.match(page, /assets\/app\.js/);
    assert.match(page, /data-reference-dialog/);
  }
  assert.ok(fs.existsSync(path.join(root, "assets/facility-map.svg")));
  assert.equal(fs.existsSync(path.join(root, "package.json")), false);
});

test("A6R storyboard artwork is preserved byte-for-byte and mapped intentionally", () => {
  for (let i = 1; i <= 6; i += 1) {
    const name = `panel-0${i}.webp`;
    assert.equal(sha(path.join(root, "assets/storyboard", name)), sha(path.join(repo, "playable-a6r/assets/storyboard", name)), name);
  }
  const { api } = loadRuntime();
  assert.deepEqual(JSON.parse(JSON.stringify(api.INTRO_PANEL_MAP)), {
    1: "panel-01.webp", 2: "panel-03.webp", 3: "panel-04.webp", 4: "panel-02.webp",
    5: null, 6: null, 7: "panel-06.webp", 8: "panel-05.webp"
  });
  assert.match(api.introVisual(2), /林芮｜維修員｜高處避難台/);
  assert.match(api.introVisual(3), /高承｜閘門技師｜中央隔離閘東側/);
  assert.match(api.introVisual(6), /facility-map\.svg/);
});

test("runtime stays static, A7-only, and free of browser TTS or acquisition infrastructure", () => {
  const runtime = app + dialogueSource + Object.values(html).join("");
  assert.match(app, /var STORAGE_NAMESPACE = "momey-a7:"/);
  for (const forbidden of [
    "fetch(", "WebSocket", "EventSource", "speechSynthesis", "SpeechSynthesisUtterance",
    "SpeechRecognition", "webkitSpeechRecognition", "gtag", "Google Analytics", "Cloudflare", "D1",
    "localStorage.clear("
  ]) assert.equal(runtime.includes(forbidden), false, forbidden);
});

test("canonical dialogue has all required fields, 14 selective spoken records, and 12 text-only diagnostics", () => {
  const { api } = loadRuntime();
  assert.equal(api.DIALOGUE.length, 26);
  assert.equal(manifest.entries.length, 26);
  const required = ["DIALOGUE_ID", "STAGE", "PROFILE", "TRIGGER", "CAPTION_TEXT", "VOICE_TEXT", "AUDIO_FILE", "MEANING_TAG"];
  for (const row of api.DIALOGUE) {
    for (const field of required) assert.ok(Object.hasOwn(row, field), `${row.DIALOGUE_ID}:${field}`);
    assert.ok(row.CAPTION_TEXT.length > 0, row.DIALOGUE_ID);
  }
  assert.equal(api.DIALOGUE.filter((row) => row.AUDIO_FILE).length, 14);
  assert.equal(api.DIALOGUE.filter((row) => !row.AUDIO_FILE && !row.VOICE_TEXT).length, 12);
  assert.equal(manifest.assetStatus, "READY");
  assert.equal(manifest.audioFilesPresent, true);
  for (const entry of manifest.entries.filter((row) => row.audioFile)) {
    assert.equal(entry.assetStatus, "READY", entry.id);
    assert.equal(fs.existsSync(path.join(root, entry.audioFile)), true, entry.audioFile);
  }
  assert.equal(new Set(api.DIALOGUE.map((row) => row.DIALOGUE_ID)).size, 26);
  assert.deepEqual(JSON.parse(JSON.stringify(api.DIALOGUE.filter((row) => row.STAGE === "RESULT").map((row) => row.TRIGGER).sort())), [
    "DIAGNOSTIC_O1", "DIAGNOSTIC_O1", "DIAGNOSTIC_O2", "DIAGNOSTIC_O2",
    "DIAGNOSTIC_R1", "DIAGNOSTIC_R1", "DIAGNOSTIC_R2", "DIAGNOSTIC_R2",
    "DIAGNOSTIC_S1", "DIAGNOSTIC_S1", "DIAGNOSTIC_S2", "DIAGNOSTIC_S2"
  ]);
});

test("eight intro beats are sequential and future role links are absent before completion", () => {
  const { rootNode } = loadRuntime({ url: "https://example.test/playable-a7/?seed=A7-INTRO", page: "entry", role: "0" });
  assert.match(rootNode.innerHTML, /data-intro-beat="1"/);
  assert.match(rootNode.innerHTML, /1 \/ 8/);
  assert.equal(rootNode.innerHTML.includes("role-1.html"), false);
  assert.equal((rootNode.innerHTML.match(/data-intro-next/g) || []).length, 1);
  assert.equal((rootNode.innerHTML.match(/海岬防洪站保護控制室/g) || []).length, 1, "caption must not duplicate");
});

test("role first screen has duty, immediate action, two neutral questions, and no preselection", () => {
  const { api } = loadRuntime();
  for (const id of [1, 2, 3]) {
    const markup = api.roleStage(api.ROLES[id], roleState({ roleId: id }));
    assert.match(markup, /【你負責】/);
    assert.match(markup, /【你現在要做】/);
    assert.equal((markup.match(/data-diagnostic=/g) || []).length, 2);
    assert.equal((markup.match(/aria-pressed="true"/g) || []).length, 0);
    assert.match(markup, /data-role-start disabled/);
    assert.equal(markup.includes("data-consequence"), false);
  }
});

test("progressive disclosure keeps result, decision, and consequence in their own stages", () => {
  const { api } = loadRuntime();
  const role = api.ROLES[1];
  const operate = api.currentStageMarkup(role, roleState({ stage: "OPERATE", draft: "O1", started: true }));
  assert.match(operate, /data-stage="OPERATE"/);
  assert.doesNotMatch(operate, /查到：|data-decision=|data-consequence/);
  const result = api.currentStageMarkup(role, roleState({ stage: "RESULT", draft: "O1", confirmed: "O1", started: true }));
  assert.equal((result.match(/<li>/g) || []).length, 2);
  assert.match(result, /查到：/);
  assert.match(result, /仍不知道：/);
  assert.doesNotMatch(result, /data-decision=|data-consequence/);
  const discuss = api.currentStageMarkup(role, roleState({ stage: "DISCUSS", draft: "O1", confirmed: "O1", started: true }));
  assert.match(discuss, /三人都說完了/);
  assert.doesNotMatch(discuss, /data-decision=|data-consequence/);
});

test("decision uses physical language, local group agreement, editable draft, and locked consequence", () => {
  const { api } = loadRuntime();
  const role = api.ROLES[1];
  const draft = api.currentStageMarkup(role, roleState({ stage: "DECIDE", confirmed: "O1", decisionDraft: "close" }));
  assert.match(draft, /林芮/);
  assert.match(draft, /高承/);
  assert.match(draft, /西側救援軌道失去供電/);
  assert.match(draft, /三人都確認選同一項了/);
  assert.match(draft, /data-confirm-decision disabled/);
  assert.doesNotMatch(draft, /死亡|永久傷害|永久呼吸傷害/);
  const agreed = api.currentStageMarkup(role, roleState({ stage: "DECIDE", confirmed: "O1", decisionDraft: "close", agreementConfirmed: true }));
  assert.match(agreed, /執行：現在關上中央隔離閘/);
  assert.doesNotMatch(agreed, /data-confirm-decision disabled/);
  const ending = api.currentStageMarkup(role, roleState({ stage: "ENDING", confirmed: "O1", decisionDraft: "close", agreementConfirmed: true, decisionLocked: "close" }));
  assert.match(ending, /林芮.*死亡.*高承安全/s);
});

test("all four fixed outcomes preserve the A6R causal truth", () => {
  const { api } = loadRuntime();
  const byId = api.DIALOGUE_BY_ID;
  assert.match(byId.A7_CONSEQUENCE_BREAKLINE_CLOSE.CAPTION_TEXT, /林芮.*死亡.*高承安全/s);
  assert.match(byId.A7_CONSEQUENCE_BREAKLINE_HOLD.CAPTION_TEXT, /林芮.*救回.*高承死亡/s);
  assert.match(byId.A7_CONSEQUENCE_BACKWASH_CLOSE.CAPTION_TEXT, /林芮.*永久傷害.*高承安全/s);
  assert.match(byId.A7_CONSEQUENCE_BACKWASH_HOLD.CAPTION_TEXT, /林芮.*永久傷害前.*高承.*永久呼吸傷害/s);
});

test("seed and role storage keys are isolated and reset never clears foreign namespaces", () => {
  const a = loadRuntime({ url: "https://example.test/playable-a7/role-1.html?seed=SEED-A", page: "role", role: "1" });
  assert.equal(a.api.getStorageKey(), "momey-a7:SEED-A:role-1");
  assert.equal(a.api.getStorageKey("role-2"), "momey-a7:SEED-A:role-2");
  const b = loadRuntime({ url: "https://example.test/playable-a7/role-1.html?seed=SEED-B", page: "role", role: "1" });
  assert.equal(b.api.getStorageKey(), "momey-a7:SEED-B:role-1");
  assert.notEqual(a.api.profileForSeed("CASE0"), a.api.profileForSeed("CASE1"));
  assert.doesNotMatch(app, /allFindingsConfirmed|allFindingsShared/);
  assert.match(app, /seedPrefix\(normalizedSeed\(\)\)/);
});

test("facility map and player vocabulary expose the physical causal chain", () => {
  for (const term of ["控制室", "林芮", "高承", "中央隔離閘", "西側救援軌道", "海水與污染", "關上後無法通過"]) assert.match(mapSvg, new RegExp(term));
  const playerText = dialogueSource + app;
  for (const jargon of ["時序鏈", "備援程序", "回波", "前緣", "控制鏈", "確認模組", "檢查節點"]) assert.equal(playerText.includes(jargon), false, jargon);
});

test("mobile CSS protects readable type, 48px touch targets, and horizontal layout", () => {
  assert.match(css, /font-size:\s*16px/);
  assert.match(css, /min-height:\s*48px/);
  assert.match(css, /overflow-x:\s*clip/);
  assert.match(css, /@media \(max-width:\s*520px\)/);
  assert.match(css, /@media \(max-width:\s*360px\)/);
});
