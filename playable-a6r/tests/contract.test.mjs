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
const css = read("assets/styles.css");
const pages = ["index.html", "role-1.html", "role-2.html", "role-3.html"];
const html = Object.fromEntries(pages.map((file) => [file, read(file)]));
const manifest = JSON.parse(read("assets/audio/voice-manifest.json"));
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function loadRuntime(url = "https://example.test/playable-a6r/role-1.html?seed=ALPHA2") {
  const store = new Map();
  const document = {
    body: { dataset: { page: "test", role: "1" } },
    addEventListener() {},
    querySelector() { return null; }
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
    history: { replaceState() {} },
    localStorage,
    crypto: crypto.webcrypto,
    setTimeout,
    addEventListener() {},
    MomeyA6R: null
  };
  window.window = window;
  const context = {
    window,
    document,
    URL,
    URLSearchParams,
    Uint8Array,
    Math,
    Object,
    String,
    JSON,
    console,
    navigator: {}
  };
  vm.createContext(context);
  vm.runInContext(app, context);
  return { api: context.window.MomeyA6R, store, context };
}

function state(api, overrides = {}) {
  return Object.assign(api.defaultState(), overrides);
}

function stageMarkup(api, roleId, overrides = {}) {
  return api.renderCurrentStage(api.roles[roleId], state(api, overrides));
}

function noFuture(markup, markers) {
  for (const marker of markers) assert.equal(markup.includes(marker), false, marker);
}

test("A6R has four isolated static pages and no package runtime", () => {
  for (const file of pages) assert.ok(fs.existsSync(path.join(root, file)), file + " missing");
  assert.match(html["index.html"], /MOMEY A6R｜海岬防洪站/);
  for (const role of ["1", "2", "3"]) {
    assert.match(html["role-" + role + ".html"], new RegExp("data-role=\"" + role + "\""));
    assert.match(html["role-" + role + ".html"], /assets\/app\.js/);
    assert.match(html["role-" + role + ".html"], /data-reference-dialog/);
    assert.match(html["role-" + role + ".html"], /data-reference-content/);
  }
  assert.equal(fs.existsSync(path.join(root, "package.json")), false);
});

test("A6 storyboard artwork is reused byte-for-byte", () => {
  for (let i = 1; i <= 6; i += 1) {
    const name = "panel-0" + i + ".webp";
    assert.equal(
      sha(path.join(root, "assets", "storyboard", name)),
      sha(path.join(repo, "playable-a6", "assets", "storyboard", name)),
      name
    );
  }
});

test("runtime is isolated and contains no forbidden infrastructure or browser TTS", () => {
  const allRuntime = app + Object.values(html).join("");
  assert.match(app, /var VERSION = "momey-a6r:"/);
  for (const forbidden of [
    "fetch(", "WebSocket", "EventSource", "gtag", "Google Analytics",
    "Cloudflare", "D1", "payment", "SpeechRecognition",
    "webkitSpeechRecognition", "speechSynthesis", "SpeechSynthesisUtterance",
    "localStorage.clear("
  ]) assert.equal(allRuntime.includes(forbidden), false, forbidden);
});

test("three peer roles, two options each, two profiles, and four consequences remain reachable", () => {
  const { api } = loadRuntime();
  assert.deepEqual(Object.values(api.roles).map((role) => role.name), ["作業時序", "救援聯絡", "結構安全"]);
  assert.deepEqual(JSON.parse(JSON.stringify(Object.values(api.roles).map((role) => role.options.map((option) => option.key)))), [["O1", "O2"], ["R1", "R2"], ["S1", "S2"]]);
  assert.deepEqual(Object.keys(api.profiles).sort(), ["backwash", "breakline"]);
  for (const profile of Object.values(api.profiles)) {
    assert.deepEqual(Object.keys(profile.results).sort(), ["O1", "O2", "R1", "R2", "S1", "S2"]);
    assert.deepEqual(Object.keys(profile.consequences).sort(), ["close", "hold"]);
  }
  const seen = new Set();
  for (let i = 0; i < 100; i += 1) seen.add(api.deriveProfile("CASE" + i));
  assert.deepEqual([...seen].sort(), ["backwash", "breakline"]);
});

test("dialogue schema and standalone voice manifest contain the same 22 entries", () => {
  const { api } = loadRuntime();
  assert.equal(api.dialogue.length, 22);
  assert.equal(api.voiceManifest.length, 22);
  assert.equal(manifest.entries.length, 22);
  assert.equal(manifest.audioFilesPresent, true);
  for (const entry of manifest.entries) {
    assert.equal(fs.existsSync(path.join(root, entry.audioFile)), true, entry.id + " audio missing");
  }
  const runtimeById = new Map(api.voiceManifest.map((row) => [row.id, row]));
  const fileById = new Map(manifest.entries.map((row) => [row.id, row]));
  assert.deepEqual([...runtimeById.keys()], [...fileById.keys()]);
  for (const [id, runtime] of runtimeById) {
    const external = fileById.get(id);
    assert.ok(external, id);
    for (const field of ["captionText", "spokenText", "audioFile", "engine", "voice", "assetStatus"]) {
      assert.equal(runtime[field], external[field], id + ":" + field);
    }
    assert.match(runtime.audioFile, /^assets\/audio\/kokoro-zm-010\/[a-z0-9_]+\.mp3$/);
  }
});

test("fresh ROLE markup is strictly one actionable role card", () => {
  const { api } = loadRuntime();
  const markup = stageMarkup(api, "1");
  assert.match(markup, /data-stage-purpose="ROLE"/);
  assert.match(markup, /【你負責】/);
  assert.match(markup, /【現在要做】/);
  assert.equal((markup.match(/class="primary-button/g) || []).length, 1);
  assert.match(markup, /data-start-role/);
  noFuture(markup, [
    "operator-console", "progress-bar", "data-reference-open",
    "troubleshooting", "result-grid", "data-final-choice",
    "consequence-grid", "data-new-session", "立即封閉", "維持 95 秒"
  ]);
  assert.equal(markup.includes("目前已知"), false);
  assert.equal(markup.includes("仍未知"), false);
});

test("each disclosure gate renders only its current stage and hides future stages", () => {
  const { api } = loadRuntime();
  const futureAfterChoose = ["result-grid", "data-result-share", "data-final-choice", "data-agreement-spoken", "consequence-grid"];
  const futureAfterOperate = ["result-grid", "data-result-share", "data-final-choice", "data-agreement-spoken", "consequence-grid"];
  const futureAfterResult = ["data-final-choice", "data-agreement-spoken", "data-final-confirm", "consequence-grid", "事件回報"];
  const futureAfterDiscuss = ["data-final-choice", "data-agreement-spoken", "data-final-confirm", "consequence-grid", "事件回報"];
  const futureAfterDecision = ["consequence-grid", "事件回報", "後來確認"];

  assert.match(stageMarkup(api, "1", { roleStarted: true }), /data-stage-purpose="CHOOSE"/);
  noFuture(stageMarkup(api, "1", { roleStarted: true }), futureAfterChoose);

  assert.match(stageMarkup(api, "1", { roleStarted: true, coordinationConfirmed: true }), /data-stage-purpose="OPERATE"/);
  noFuture(stageMarkup(api, "1", { roleStarted: true, coordinationConfirmed: true }), futureAfterOperate);

  const resultState = { roleStarted: true, coordinationConfirmed: true, diagnosticDraft: "O1", diagnosticConfirmed: "O1" };
  assert.match(stageMarkup(api, "1", resultState), /data-stage-purpose="RESULT"/);
  noFuture(stageMarkup(api, "1", resultState), futureAfterResult);

  const discussState = Object.assign({}, resultState, { resultAcknowledged: true });
  assert.match(stageMarkup(api, "1", discussState), /data-stage-purpose="DISCUSS"/);
  noFuture(stageMarkup(api, "1", discussState), futureAfterDiscuss);

  const decisionState = Object.assign({}, discussState, { discussionConfirmed: true, finalDraft: "close" });
  assert.match(stageMarkup(api, "1", decisionState), /data-stage-purpose="DECIDE"/);
  noFuture(stageMarkup(api, "1", decisionState), futureAfterDecision);

  const endingState = Object.assign({}, decisionState, { agreementSpoken: true, finalConfirmed: "close" });
  assert.match(stageMarkup(api, "1", endingState), /data-stage-purpose="ENDING"/);
  assert.match(stageMarkup(api, "1", endingState), /data-stage-purpose="ENDING"/);
});

test("reference drawer only contains revealed facts at each gate", () => {
  const { api } = loadRuntime();
  const role = api.roles["1"];
  const choose = api.renderReference(role, state(api, { roleStarted: true }));
  assert.match(choose, /我的角色/);
  assert.match(choose, /目前已知/);
  assert.equal(choose.includes("查到的事"), false);
  assert.equal(choose.includes("事件回報"), false);

  const resultState = state(api, { roleStarted: true, coordinationConfirmed: true, diagnosticDraft: "O2", diagnosticConfirmed: "O2" });
  const result = api.renderReference(role, resultState);
  assert.match(result, /查到的事/);
  assert.match(result, /仍不知道/);
  assert.equal(result.includes("事件回報"), false);
  assert.equal(result.includes("後來確認"), false);

  const decision = api.renderReference(role, Object.assign({}, resultState, { resultAcknowledged: true, discussionConfirmed: true, finalDraft: "hold" }));
  assert.match(decision, /交換狀態/);
  assert.equal(decision.includes("事件回報"), false);
  assert.equal(decision.includes("後來確認"), false);

  const ending = api.renderReference(role, Object.assign({}, resultState, { resultAcknowledged: true, discussionConfirmed: true, finalDraft: "hold", agreementSpoken: true, finalConfirmed: "hold" }));
  assert.match(ending, /事件回報/);
  assert.match(ending, /事件回報/);
});

test("diagnostic and final drafts can change before confirmation and lock after confirmation", () => {
  const { api } = loadRuntime();
  const o1 = stageMarkup(api, "1", { roleStarted: true, coordinationConfirmed: true, diagnosticDraft: "O1" });
  const o2 = stageMarkup(api, "1", { roleStarted: true, coordinationConfirmed: true, diagnosticDraft: "O2" });
  assert.match(o1, /data-diagnostic-option="O1" aria-pressed="true"/);
  assert.match(o2, /data-diagnostic-option="O2" aria-pressed="true"/);
  assert.match(stageMarkup(api, "1", { roleStarted: true, coordinationConfirmed: true, diagnosticDraft: "O2", diagnosticConfirmed: "O2" }), /data-stage-purpose="RESULT"/);
  assert.equal(stageMarkup(api, "1", { roleStarted: true, coordinationConfirmed: true, diagnosticDraft: "O2", diagnosticConfirmed: "O2" }).includes("data-diagnostic-option"), false);

  const closeDraft = stageMarkup(api, "1", { roleStarted: true, coordinationConfirmed: true, diagnosticConfirmed: "O2", resultAcknowledged: true, discussionConfirmed: true, finalDraft: "close" });
  const holdDraft = stageMarkup(api, "1", { roleStarted: true, coordinationConfirmed: true, diagnosticConfirmed: "O2", resultAcknowledged: true, discussionConfirmed: true, finalDraft: "hold" });
  assert.match(closeDraft, /data-final-choice="close" class="is-selected"/);
  assert.match(holdDraft, /data-final-choice="hold" class="is-selected"/);
  assert.match(stageMarkup(api, "1", { roleStarted: true, coordinationConfirmed: true, diagnosticConfirmed: "O2", resultAcknowledged: true, discussionConfirmed: true, finalDraft: "hold", agreementSpoken: true, finalConfirmed: "hold" }), /data-stage-purpose="ENDING"/);
});

test("each stage has at most one dominant advancing CTA", () => {
  const { api } = loadRuntime();
  const states = [
    {},
    { roleStarted: true },
    { roleStarted: true, coordinationConfirmed: true },
    { roleStarted: true, coordinationConfirmed: true, diagnosticConfirmed: "O1" },
    { roleStarted: true, coordinationConfirmed: true, diagnosticConfirmed: "O1", resultAcknowledged: true },
    { roleStarted: true, coordinationConfirmed: true, diagnosticConfirmed: "O1", resultAcknowledged: true, discussionConfirmed: true },
    { roleStarted: true, coordinationConfirmed: true, diagnosticConfirmed: "O1", resultAcknowledged: true, discussionConfirmed: true, finalDraft: "close", agreementSpoken: true, finalConfirmed: "close" }
  ];
  for (const overrides of states) {
    const markup = stageMarkup(api, "1", overrides);
    const dominant = (markup.match(/class="(?:primary-button|danger-button)/g) || []).length;
    assert.ok(dominant <= 1, markup);
  }
});

test("refresh/reset namespace contract is A6R-only", () => {
  const { api } = loadRuntime();
  assert.equal(api.VERSION, "momey-a6r:");
  assert.match(app, /safeStorageRemovePrefix\(VERSION \+ seed \+ ":"\)/);
  for (const forbidden of ["momey-a1:", "momey-a2:", "momey-a3:", "momey-a4:", "momey-a5:", "localStorage.clear("]) assert.equal(app.includes(forbidden), false, forbidden);
  assert.match(app, /writeState\(seed, roleId, currentState\)/);
  assert.match(app, /readState\(seed, roleId\)/);
});

test("mobile CSS covers readable type, touch targets, and horizontal overflow", () => {
  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(css, /font-size: 16px/);
  assert.match(css, /min-height: 48px/);
  assert.match(css, /min-height: 50px/);
  assert.match(css, /overflow-x: clip/);
});

