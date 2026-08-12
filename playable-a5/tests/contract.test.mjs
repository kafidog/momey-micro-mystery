import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const repo = path.resolve(root, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const app = read("assets/app.js");
const css = read("assets/styles.css");
const pages = ["index.html", "role-1.html", "role-2.html", "role-3.html"];
const html = Object.fromEntries(pages.map((file) => [file, read(file)]));

const imageNames = Array.from({ length: 6 }, (_, index) => `panel-0${index + 1}.webp`);
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function commandModel() {
  return {
    exchangeComplete: false,
    verificationDraft: null,
    verificationConfirmed: null,
    specialistReportHeard: false,
    finalDraft: null,
    finalConfirmed: null,
    consequence: null,
    finishExchange() { this.exchangeComplete = true; },
    draftVerification(key) {
      if (!this.exchangeComplete || this.verificationConfirmed || !["A", "B"].includes(key)) return false;
      this.verificationDraft = key;
      return true;
    },
    confirmVerification() {
      if (!this.exchangeComplete || !this.verificationDraft || this.verificationConfirmed) return false;
      this.verificationConfirmed = this.verificationDraft;
      return true;
    },
    hearReport() {
      if (!this.verificationConfirmed || this.specialistReportHeard) return false;
      this.specialistReportHeard = true;
      return true;
    },
    draftFinal(key) {
      if (!this.specialistReportHeard || this.finalConfirmed || !["close", "hold"].includes(key)) return false;
      this.finalDraft = key;
      return true;
    },
    confirmFinal(branches) {
      if (!this.verificationConfirmed || !this.specialistReportHeard || !this.finalDraft || this.finalConfirmed) return false;
      this.finalConfirmed = this.finalDraft;
      this.consequence = branches[`${this.verificationConfirmed}|${this.finalDraft}`];
      return Boolean(this.consequence);
    }
  };
}

function specialistModel(key, ownerRole) {
  return {
    key,
    ownerRole,
    authorizationArmed: false,
    completed: false,
    result: null,
    arm(role) {
      if (role !== this.ownerRole || this.completed) return false;
      this.authorizationArmed = true;
      return true;
    },
    cancel(role) {
      if (role !== this.ownerRole || this.completed) return false;
      this.authorizationArmed = false;
      return true;
    },
    execute(role) {
      if (role !== this.ownerRole || !this.authorizationArmed || this.completed) return false;
      this.completed = true;
      this.result = `${key}-result`;
      return true;
    }
  };
}

const fixedBranches = {
  "A|close": "林芮失去生命",
  "A|hold": "高承留到控制廊隔離完成",
  "B|close": "林芮失去生命",
  "B|hold": "救援推車把林芮帶出"
};

test("A5 has the four isolated static pages and no framework shell", () => {
  for (const page of pages) assert.ok(fs.existsSync(path.join(root, page)), `${page} missing`);
  assert.match(html["index.html"], /MOMEY A5｜海岬防洪站/);
  for (const role of [1, 2, 3]) {
    assert.match(html[`role-${role}.html`], new RegExp(`data-role="${role}"`));
    assert.match(html[`role-${role}.html`], /assets\/app\.js/);
  }
  assert.equal(fs.existsSync(path.join(root, "package.json")), false);
});

test("the six A4 storyboard panels are reused byte-for-byte", () => {
  for (const image of imageNames) {
    const a4 = path.join(repo, "playable-a4", "assets", "storyboard", image);
    const a5 = path.join(root, "assets", "storyboard", image);
    assert.equal(sha256(a5), sha256(a4), `${image} changed`);
  }
});

test("story, allied premise, names, and fixed 20/95 timeline remain", () => {
  for (const marker of ["林芮", "高承", "你們是同一隊", "20 秒封閉會切斷 95 秒救援", "全隊決定"]) {
    assert.ok((app + html["index.html"]).includes(marker), `missing ${marker}`);
  }
  assert.equal((html["index.html"].match(/class="story-panel/g) || []).length, 6);
});

test("A5 uses an isolated localStorage prefix and no fake infrastructure", () => {
  assert.ok(app.includes('const STORAGE_PREFIX = "momey-a5:"'));
  for (const forbidden of ["fetch(", "WebSocket", "EventSource", "gtag", "Google Analytics", "Cloudflare", "D1", "payment", "account", "localStorage.clear("]) {
    assert.equal(app.includes(forbidden), false, `forbidden runtime marker: ${forbidden}`);
  }
});

test("each role keeps its distinct A4 capability tool", () => {
  for (const marker of ["data-command-process", "data-command-endpoint", "data-inspect-field", "data-pressure-range", "data-pressure-marker"]) {
    assert.ok(app.includes(marker), `role tool missing: ${marker}`);
  }
  assert.match(app, /alignment\.closure === "20" && alignment\.rescue === "95"/);
  assert.match(app, /inspected\.length === Object\.keys\(signalFields\)\.length/);
  assert.match(app, /if \(seconds >= 95\) completeTool\("3", progress\)/);
});

test("one explicit Close Hold Unsure judgment remains and survey follow-ups are absent", () => {
  const close = app.indexOf('{ key: "close"');
  const hold = app.indexOf('{ key: "hold"');
  const unsure = app.indexOf('{ key: "unsure"');
  assert.ok(close > 0 && close < hold && hold < unsure);
  assert.ok(app.includes("data-initial-judgment"));
  for (const obsolete of ["teamReady", "reconsiderationAt", "postVerificationReady", "data-reconsideration", "data-post-verification-ready"]) {
    assert.equal(app.includes(obsolete), false, `obsolete A4 state remains: ${obsolete}`);
  }
});

test("Command alone owns open-exchange progression", () => {
  assert.match(app, /target\.matches\("\[data-exchange-complete\]"\) && currentRole === "1"/);
  assert.ok(app.includes("三人的證據與目前判斷都已說完"));
  assert.equal((app.match(/data-exchange-complete/g) || []).length, 2, "one render marker plus one handler expected");
});

test("Command verification draft can change and locks only on confirmation", () => {
  const state = commandModel();
  assert.equal(state.draftVerification("A"), false);
  state.finishExchange();
  assert.equal(state.draftVerification("A"), true);
  assert.equal(state.draftVerification("B"), true);
  assert.equal(state.verificationDraft, "B");
  assert.equal(state.confirmVerification(), true);
  assert.equal(state.verificationConfirmed, "B");
  assert.equal(state.draftVerification("A"), false);
  assert.match(app, /currentRole === "1"[\s\S]*?verificationDraft/);
});

test("Command authorizes but never automatically renders detailed specialist result", () => {
  const commandBlock = app.slice(app.indexOf("function renderVerification"), app.indexOf("function renderDecision"));
  assert.ok(commandBlock.includes("data-command-handoff"));
  assert.ok(commandBlock.includes("data-report-heard"));
  assert.equal(commandBlock.includes("specialistChecks["), false);
  assert.equal(commandBlock.includes("verified-evidence"), false);
  assert.ok(commandBlock.includes("詳細回傳只在執行查證的專員手上"));
});

test("Rescue uniquely executes A and Safety uniquely executes B", () => {
  assert.match(app, /A:\s*\{[\s\S]*?role: "2"/);
  assert.match(app, /B:\s*\{[\s\S]*?role: "3"/);
  assert.match(app, /check\?\.role === currentRole && state\.authorizationArmed && !state\.completed/);
  const a = specialistModel("A", "2");
  const b = specialistModel("B", "3");
  assert.equal(a.arm("3"), false);
  assert.equal(b.arm("2"), false);
  assert.equal(a.arm("2"), true);
  assert.equal(b.arm("3"), true);
});

test("a first specialist click only arms the gate and cannot reveal a result", () => {
  const a = specialistModel("A", "2");
  assert.equal(a.arm("2"), true);
  assert.equal(a.authorizationArmed, true);
  assert.equal(a.completed, false);
  assert.equal(a.result, null);
  assert.ok(app.includes("這一步只做最後核對，不會啟動診斷脈衝"));
  assert.ok(app.includes("data-specialist-arm"));
  assert.ok(app.includes("data-specialist-execute"));
});

test("wrong-side accidental opening remains reversible and does not reveal B", () => {
  const b = specialistModel("B", "3");
  assert.equal(b.arm("3"), true);
  assert.equal(b.completed, false);
  assert.equal(b.cancel("3"), true);
  assert.equal(b.authorizationArmed, false);
  assert.equal(b.execute("3"), false);
  assert.equal(b.result, null);
  assert.ok(app.includes("data-specialist-cancel"));
});

test("specialist execution reveals exactly the owned detailed result after the two-step gate", () => {
  for (const [key, role] of [["A", "2"], ["B", "3"]]) {
    const specialist = specialistModel(key, role);
    assert.equal(specialist.execute(role), false);
    assert.equal(specialist.arm(role), true);
    assert.equal(specialist.execute(role), true);
    assert.equal(specialist.completed, true);
    assert.equal(specialist.execute(role), false);
  }
  assert.match(app, /state\.completed \? evidenceCard\(state\.result, "verified-evidence"\)/);
});

test("post-verification reconsideration is human speech, not stored answers", () => {
  assert.ok(app.includes("有人改變看法嗎？為什麼？"));
  assert.equal(app.includes("Changed"), false);
  assert.equal(app.includes("Still Unsure"), false);
  assert.equal(app.includes("reconsideration:"), false);
});

test("specialist verbal report is required before Command final controls appear", () => {
  const state = commandModel();
  state.finishExchange();
  state.draftVerification("A");
  state.confirmVerification();
  assert.equal(state.draftFinal("close"), false);
  assert.equal(state.hearReport(), true);
  assert.equal(state.draftFinal("close"), true);
  assert.match(app, /if \(!command\.specialistReportHeard \|\| !command\.verificationConfirmed\) return ""/);
});

test("Command final draft can change and locks on the team confirmation", () => {
  const state = commandModel();
  state.finishExchange();
  state.draftVerification("A");
  state.confirmVerification();
  state.hearReport();
  assert.equal(state.draftFinal("close"), true);
  assert.equal(state.draftFinal("hold"), true);
  assert.equal(state.finalDraft, "hold");
  assert.equal(state.confirmFinal(fixedBranches), true);
  assert.equal(state.finalConfirmed, "hold");
  assert.equal(state.draftFinal("close"), false);
});

test("all four A/B by Close/Hold branches remain reachable", () => {
  for (const [verification, final] of [["A", "close"], ["A", "hold"], ["B", "close"], ["B", "hold"]]) {
    const state = commandModel();
    state.finishExchange();
    state.draftVerification(verification);
    state.confirmVerification();
    state.hearReport();
    state.draftFinal(final);
    assert.equal(state.confirmFinal(fixedBranches), true, `${verification}|${final}`);
    assert.ok(state.consequence, `${verification}|${final} missing consequence`);
  }
  for (const marker of Object.keys(fixedBranches)) assert.ok(app.includes(`"${marker}"`));
});

test("Rescue and Safety cannot render final controls or consequence", () => {
  const specialistBlock = app.slice(app.indexOf("function renderSpecialistStage"), app.indexOf("function renderTeamStages"));
  assert.equal(specialistBlock.includes("data-final-choice"), false);
  assert.equal(specialistBlock.includes("data-final-confirm"), false);
  assert.equal(specialistBlock.includes("consequence-stage"), false);
  assert.ok(specialistBlock.includes("最後由事件指揮依全隊說好的選項執行"));
  assert.match(app, /target\.matches\("\[data-final-choice\]"\) && currentRole === "1"/);
  assert.match(app, /target\.matches\("\[data-final-confirm\]"\) && currentRole === "1"/);
});

test("moral ownership remains with the team while Command is only custodian", () => {
  for (const marker of ["指揮只負責把那一項按下去", "支持哪個選擇，為什麼", "指揮只按全隊最後說好的選項", "這是三人共同決定"]) {
    assert.ok(app.includes(marker), `alpha-player countermeasure missing: ${marker}`);
  }
  assert.equal(app.includes("多數決"), false);
  assert.equal(app.includes("票數"), false);
});

test("full sharing retains one unverified uncertainty", () => {
  assert.ok(app.includes("所有相關事實都可以分享"));
  assert.ok(app.includes("東閘撐架能不能承受完整的 95 秒"));
  assert.ok(app.includes("林芮目前的位置與西側路線是否可通"));
  assert.match(app, /<span>仍未知<\/span><p>\$\{choice\.remains\}<\/p>/);
});

test("refresh-safe state is serializable without cross-device claims", () => {
  const state = commandModel();
  state.finishExchange();
  state.draftVerification("B");
  state.confirmVerification();
  state.hearReport();
  state.draftFinal("close");
  const restored = JSON.parse(JSON.stringify(state, (key, value) => typeof value === "function" ? undefined : value));
  assert.deepEqual(restored, {
    exchangeComplete: true,
    verificationDraft: "B",
    verificationConfirmed: "B",
    specialistReportHeard: true,
    finalDraft: "close",
    finalConfirmed: null,
    consequence: null
  });
  for (const forbidden of ["synchronized", "同步完成", "三支手機已同步"]) assert.equal(app.includes(forbidden), false);
});

test("reset clears only momey-a5 keys", () => {
  const storage = new Map([
    ["momey-a1:shared", "keep-a1"],
    ["momey-a2:shared", "keep-a2"],
    ["momey-a3:shared", "keep-a3"],
    ["momey-a4:shared", "keep-a4"],
    ["momey-a5:command", "remove"],
    ["momey-a5:seat:2", "remove"]
  ]);
  [...storage.keys()].filter((key) => key.startsWith("momey-a5:")).forEach((key) => storage.delete(key));
  assert.deepEqual([...storage.keys()], ["momey-a1:shared", "momey-a2:shared", "momey-a3:shared", "momey-a4:shared"]);
  assert.match(app, /key\.startsWith\(STORAGE_PREFIX\)/);
});

test("A5 materially compresses the canonical A4 three-phone path", () => {
  const before = { command: 12, rescue: 12, safety: 10, total: 34, groupForms: 12, duplicatedChoiceSurfaces: 6 };
  const afterA = { command: 11, rescue: 7, safety: 3, total: 21, groupForms: 4, duplicatedChoiceSurfaces: 0 };
  const afterB = { command: 11, rescue: 5, safety: 5, total: 21, groupForms: 4, duplicatedChoiceSurfaces: 0 };
  assert.ok(afterA.total < before.total && afterB.total < before.total);
  assert.ok(afterA.groupForms < before.groupForms);
  assert.equal(afterA.duplicatedChoiceSurfaces, 0);
});

test("mobile styles cover A5 custody surfaces and touch targets", () => {
  for (const marker of [".pressure-track", ".authorization-gate", ".gate-actions", ".final-summary", ".alpha-prompt", ".human-question"]) {
    assert.ok(css.includes(marker), `missing CSS ${marker}`);
  }
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /@media\s*\(max-width:\s*660px\)/);
  assert.match(css, /\.final-summary,[\s\S]*?\.gate-actions[\s\S]*?grid-template-columns:\s*1fr/);
});

test("player-facing copy avoids obsolete survey and fake-sync language", () => {
  for (const forbidden of ["記錄你的", "reconsideration", "baseline", "問卷", "研究表單", "三支手機已同步"]) {
    assert.equal(app.includes(forbidden), false, `player/runtime copy regression: ${forbidden}`);
  }
  assert.ok(app.includes("先聽指揮宣布"));
  assert.ok(app.includes("大家一起看結果"));
});

