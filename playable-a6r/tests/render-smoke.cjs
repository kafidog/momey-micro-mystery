const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

const root = path.resolve(__dirname, "..");
const modulePath = process.env.MOMEY_A6R_PLAYWRIGHT_MODULE || "playwright";
let playwright;
try {
  playwright = require(modulePath);
} catch (error) {
  throw new Error("PLAYWRIGHT_MODULE_UNAVAILABLE: set MOMEY_A6R_PLAYWRIGHT_MODULE to playwright/index.js; " + error.message);
}
const { chromium } = playwright;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg"
};

function startServer() {
  const server = http.createServer((request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    } catch (_) {
      response.writeHead(400).end();
      return;
    }
    const relative = pathname.replace(/^\/playable-a6r\/?/, "") || "index.html";
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404).end("not found");
      return;
    }
    response.writeHead(200, { "Content-Type": mime[path.extname(file).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function profile(seed) {
  const clean = seed.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  let hash = 2166136261;
  for (let i = 0; i < clean.length; i += 1) {
    hash ^= clean.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 2 === 0 ? "breakline" : "backwash";
}

function seedFor(target) {
  for (let i = 0; i < 1000; i += 1) {
    const seed = "CASE" + i;
    if (profile(seed) === target) return seed;
  }
  throw new Error("seed not found: " + target);
}

const issues = [];
const requestFailures = [];
const expectedAudioFailures = new WeakSet();

function observe(page, label) {
  page.setDefaultTimeout(10000);
  page.on("console", (message) => {
    const expected404 = expectedAudioFailures.has(page) && /Failed to load resource.*404/i.test(message.text());
    if (["error", "warning"].includes(message.type()) && !expected404) issues.push(label + " console " + message.type() + ": " + message.text());
  });
  page.on("pageerror", (error) => issues.push(label + " pageerror: " + error.message));
  page.on("requestfailed", (request) => {
    if (!/\.mp3(?:\?|$)/i.test(request.url())) requestFailures.push(label + " " + request.url() + " " + request.failure()?.errorText);
  });
}

async function healthy(page, label) {
  const state = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    blank: document.body.innerText.trim().length < 60,
    overlay: /Vite|Webpack|Next\.js|Application error|Internal Server Error/i.test(document.body.innerText)
  }));
  assert.deepEqual(state, { overflow: false, blank: false, overlay: false }, label);
}

async function touchTargets(page, label) {
  const failures = await page.locator("button, a").evaluateAll((nodes) => nodes
    .filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(node).visibility !== "hidden";
    })
    .map((node) => {
      const rect = node.getBoundingClientRect();
      return { text: node.textContent.trim(), width: rect.width, height: rect.height };
    })
    .filter((item) => item.width < 48 || item.height < 48));
  assert.deepEqual(failures, [], label + " touch target failures");
}

async function openRole(browser, baseURL, role, seed, viewport, label) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  observe(page, label);
  await page.goto(baseURL + "/role-" + role + ".html?seed=" + seed, { waitUntil: "networkidle" });
  await healthy(page, label + " initial");
  return { context, page };
}

async function assertFreshRole(page, label) {
  assert.equal(await page.locator('[data-stage-purpose="ROLE"]').count(), 1, label + " ROLE");
  assert.equal(await page.locator(".operator-console").count(), 0, label + " operator hidden");
  assert.equal(await page.locator(".progress-bar").count(), 0, label + " progress hidden");
  assert.equal(await page.locator("[data-reference-open]").count(), 0, label + " reference control hidden");
  assert.equal(await page.locator(".troubleshooting").count(), 0, label + " troubleshooting hidden");
  assert.equal(await page.locator(".result-grid").count(), 0, label + " result hidden");
  assert.equal(await page.locator("[data-final-choice]").count(), 0, label + " decision hidden");
  assert.equal(await page.locator(".consequence-grid").count(), 0, label + " consequence hidden");
  assert.equal(await page.locator("[data-start-role]").count(), 1, label + " start CTA");
  assert.equal((await page.locator(".primary-button").count()), 1, label + " one dominant CTA");
  assert.doesNotMatch(await page.locator("body").innerText(), /立即封閉|維持 95 秒|事件回報/);
}

async function closeReference(page) {
  await page.locator("[data-reference-close]").click();
  assert.equal(await page.locator("[data-reference-dialog]").evaluate((dialog) => dialog.open), false);
}

async function exerciseReference(page, expected, forbidden, label) {
  await page.locator("[data-reference-open]").click();
  assert.equal(await page.locator("[data-reference-dialog]").evaluate((dialog) => dialog.open), true, label + " open");
  const text = await page.locator("[data-reference-content]").innerText();
  for (const marker of expected) assert.match(text, marker, label + " expected " + marker);
  for (const marker of forbidden) assert.doesNotMatch(text, marker, label + " forbidden " + marker);
  await closeReference(page);
  await page.locator("[data-reference-open]").click();
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("[data-reference-dialog]").evaluate((dialog) => dialog.open), false, label + " Escape");
}

async function runFullBranch(browser, baseURL, seed, diagnosticKey, decision, expected, label) {
  const { context, page } = await openRole(browser, baseURL, 1, seed, { width: 412, height: 915 }, label);
  try {
    await page.locator("[data-start-role]").click();
    await page.locator("[data-coordination-confirm]").click();
    await page.locator('[data-diagnostic-option="' + diagnosticKey + '"]').click();
    assert.equal(await page.locator('[data-diagnostic-option="' + diagnosticKey + '"]').getAttribute("aria-pressed"), "true");
    await page.locator("[data-diagnostic-confirm]").click();
    assert.equal(await page.locator('[data-stage-purpose="RESULT"]').count(), 1);
    const resultText = await page.locator(".result-grid").innerText();
    assert.ok(resultText.length > 30, label + " result");
    await exerciseReference(page, [/查到的事/], [/事件回報/, /後來確認/], label + " result drawer");
    await page.locator("[data-result-share]").click();
    assert.equal(await page.locator('[data-stage-purpose="DISCUSS"]').count(), 1);
    assert.equal(await page.locator("[data-final-choice]").count(), 0);
    await exerciseReference(page, [/目前已知/], [/事件回報/, /後來確認/], label + " discuss drawer");
    await page.locator("[data-discuss-confirm]").click();
    assert.equal(await page.locator('[data-stage-purpose="DECIDE"]').count(), 1);
    assert.equal(await page.locator("[data-final-choice]").count(), 2);
    await exerciseReference(page, [/交換狀態/], [/事件回報/, /後來確認/], label + " decision drawer");
    const alternate = decision === "close" ? "hold" : "close";
    await page.locator('[data-final-choice="' + alternate + '"]').click();
    await page.locator('[data-final-choice="' + decision + '"]').click();
    assert.equal(await page.locator("[data-final-confirm]").isEnabled(), false, label + " confirmation gate");
    assert.equal(await page.locator(".consequence-grid").count(), 0, label + " consequence before confirm");
    await page.locator("[data-agreement-spoken]").click();
    assert.equal(await page.locator("[data-final-confirm]").isEnabled(), true, label + " final enabled");
    await page.locator("[data-final-confirm]").click();
    assert.equal(await page.locator('[data-stage-purpose="ENDING"]').count(), 1, label + " ending");
    assert.match(await page.locator(".consequence-grid").innerText(), expected, label + " consequence");
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await page.locator('[data-stage-purpose="ENDING"]').count(), 1, label + " ending after refresh");
    assert.equal(await page.locator(".consequence-grid").count(), 1, label + " consequence after refresh");
    await healthy(page, label + " ending");
  } finally {
    await context.close();
  }
}

async function runThreeSeatFirstRun(browser, baseURL, seed) {
  const rolePlans = [
    { role: "1", diagnostic: "O1" },
    { role: "2", diagnostic: "R1" },
    { role: "3", diagnostic: "S1" }
  ];
  const opened = await Promise.all(rolePlans.map((plan) => openRole(
    browser,
    baseURL,
    plan.role,
    seed,
    { width: 390, height: 844 },
    "three-seat-role-" + plan.role
  )));
  try {
    for (let index = 0; index < opened.length; index += 1) {
      const page = opened[index].page;
      const plan = rolePlans[index];
      await assertFreshRole(page, "three-seat-role-" + plan.role);
      await page.getByRole("button", { name: "開始" }).click();
      await page.getByRole("button", { name: "開始選擇診斷" }).click();
      await page.locator('[data-diagnostic-option="' + plan.diagnostic + '"]').click();
      await page.getByRole("button", { name: "確認這項診斷" }).click();
      assert.equal(await page.locator('[data-stage-purpose="RESULT"]').count(), 1);
      await page.getByRole("button", { name: "把結果告訴隊友" }).click();
      await page.getByRole("button", { name: "交換完成，繼續" }).click();
      await page.locator('[data-final-choice="close"]').click();
      await page.getByRole("button", { name: "說出共同選擇" }).click();
      await page.getByRole("button", { name: "確認共同決定" }).click();
      assert.equal(await page.locator('[data-stage-purpose="ENDING"]').count(), 1);
      await healthy(page, "three-seat-role-" + plan.role + " ending");
    }
  } finally {
    await Promise.all(opened.map(({ context }) => context.close()));
  }
}

(async () => {
  const server = await startServer();
  const baseURL = "http://127.0.0.1:" + server.address().port + "/playable-a6r";
  const chromeCandidates = [
    process.env.MOMEY_A6R_CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe"
  ].filter(Boolean);
  const executablePath = chromeCandidates.find((candidate) => fs.existsSync(candidate));
  const launchOptions = { headless: true };
  if (executablePath) launchOptions.executablePath = executablePath;
  let browser;
  try {
    browser = await chromium.launch(launchOptions);
    const breakSeed = seedFor("breakline");
    const backwashSeed = seedFor("backwash");

    const entryContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const entry = await entryContext.newPage();
    observe(entry, "entry");
    await entry.goto(baseURL + "/index.html?seed=" + breakSeed, { waitUntil: "networkidle" });
    assert.match(await entry.title(), /MOMEY A6R/);
    assert.equal(await entry.locator(".role-link-card").count(), 3);
    assert.equal(await entry.locator("[data-role-links] a").count(), 3);
    for (const href of await entry.locator("[data-role-links] a").evaluateAll((links) => links.map((link) => link.href))) assert.match(href, new RegExp("seed=" + breakSeed));
    assert.doesNotMatch(await entry.locator("body").innerText(), new RegExp(breakSeed));
    assert.equal(await entry.locator("[data-seed-code]").textContent(), "開啟後顯示");
    await healthy(entry, "entry");
    await entryContext.close();

    for (const role of ["1", "2", "3"]) {
      const opened = await openRole(browser, baseURL, role, breakSeed, { width: 390, height: 844 }, "fresh-role-" + role);
      try {
        await assertFreshRole(opened.page, "fresh-role-" + role);
        await touchTargets(opened.page, "fresh-role-" + role);
      } finally {
        await opened.context.close();
      }
    }

    const flow = await openRole(browser, baseURL, 1, breakSeed, { width: 390, height: 844 }, "flow");
    try {
      const page = flow.page;
      await page.locator("[data-start-role]").click();
      assert.equal(await page.locator(".operator-console").count(), 1);
      assert.equal(await page.locator(".progress-bar").count(), 1);
      assert.equal(await page.locator("[data-reference-open]").count(), 1);
      assert.equal(await page.locator(".troubleshooting").count(), 1);
      await exerciseReference(page, [/目前已知/, /作業時序/], [/查到的事/, /事件回報/], "choose drawer");
      await page.locator("[data-coordination-confirm]").click();
      assert.equal(await page.locator('[data-stage-purpose="OPERATE"]').count(), 1);
      await page.locator('[data-diagnostic-option="O1"]').click();
      await page.locator('[data-diagnostic-option="O2"]').click();
      assert.equal(await page.locator('[data-diagnostic-option="O2"]').getAttribute("aria-pressed"), "true");
      assert.equal(await page.locator('[data-diagnostic-option="O1"]').getAttribute("aria-pressed"), "false");
      await page.reload({ waitUntil: "networkidle" });
      assert.equal(await page.locator('[data-stage-purpose="OPERATE"]').count(), 1);
      assert.equal(await page.locator('[data-diagnostic-option="O2"]').getAttribute("aria-pressed"), "true");
      assert.equal(await page.locator(".result-grid").count(), 0);
      await page.locator("[data-diagnostic-confirm]").click();
      assert.equal(await page.locator('[data-stage-purpose="RESULT"]').count(), 1);
      assert.equal(await page.locator("[data-diagnostic-option]").count(), 0);
      await page.locator("[data-audio-toggle]").click();
      await page.waitForTimeout(500);
      assert.match(await page.locator("[data-audio-status]").innerText(), /正在播放|播放完成/);
      await page.evaluate(() => {
        const caption = document.querySelector(".live-caption p")?.textContent;
        const row = window.MomeyA6R.dialogue.find((item) => item.captionText === caption);
        if (row) row.audioFile = "assets/audio/kokoro-zm-010/forced-missing.mp3";
      });
      expectedAudioFailures.add(page);
      await page.locator("[data-replay-voice]").click();
      await page.waitForTimeout(500);
      assert.match(await page.locator("[data-audio-status]").innerText(), /音訊暫時無法播放，請看字幕/);
      expectedAudioFailures.delete(page);
      await healthy(page, "flow result");
      await touchTargets(page, "flow result");
    } finally {
      await flow.context.close();
    }

    const reset = await openRole(browser, baseURL, 1, breakSeed, { width: 390, height: 844 }, "reset");
    try {
      await reset.page.locator("[data-start-role]").click();
      await reset.page.evaluate((oldSeed) => {
        localStorage.setItem("momey-a6:protected", "keep");
        localStorage.setItem("momey-a6r:" + oldSeed + ":role:2", "remove");
      }, breakSeed);
      await reset.page.locator("[data-troubleshooting] summary").click();
      await reset.page.locator("[data-reset]").click();
      await reset.page.waitForURL(/\/playable-a6r\/index\.html\?seed=/);
      const resetState = await reset.page.evaluate((oldSeed) => ({
        protected: localStorage.getItem("momey-a6:protected"),
        oldSeedKeys: Object.keys(localStorage).filter((key) => key.startsWith("momey-a6r:" + oldSeed + ":")),
        newSeed: new URL(location.href).searchParams.get("seed")
      }), breakSeed);
      assert.equal(resetState.protected, "keep");
      assert.deepEqual(resetState.oldSeedKeys, []);
      assert.notEqual(resetState.newSeed, breakSeed);
      await healthy(reset.page, "reset destination");
    } finally {
      await reset.context.close();
    }

    await runFullBranch(browser, baseURL, breakSeed, "O1", "close", /失去生命/, "breakline-close");
    await runFullBranch(browser, baseURL, breakSeed, "O2", "hold", /高承.*死亡/s, "breakline-hold");
    await runFullBranch(browser, baseURL, backwashSeed, "O1", "close", /永久缺氧傷害/, "backwash-close");
    await runFullBranch(browser, baseURL, backwashSeed, "O2", "hold", /永久呼吸傷害/, "backwash-hold");
    await runThreeSeatFirstRun(browser, baseURL, breakSeed);

    const mobile412 = await openRole(browser, baseURL, 3, backwashSeed, { width: 412, height: 915 }, "mobile-412");
    try {
      await assertFreshRole(mobile412.page, "mobile-412");
      await mobile412.page.locator("[data-start-role]").click();
      await mobile412.page.locator("[data-coordination-confirm]").click();
      await healthy(mobile412.page, "mobile-412 operate");
      await touchTargets(mobile412.page, "mobile-412 operate");
    } finally {
      await mobile412.context.close();
    }

    assert.deepEqual(issues, [], issues.join(" | "));
    assert.deepEqual(requestFailures, [], requestFailures.join(" | "));
    console.log(JSON.stringify({
      status: "PASS",
      baseURL,
      browser: executablePath || "Playwright-managed browser",
      tests: [
        "entry and 3 role links",
        "fresh ROLE first screen",
        "reference drawer and Escape close",
        "diagnostic draft/change/confirm/lock",
        "result/discuss/decision/ending",
        "refresh before and after confirmation",
        "A6R-only reset",
        "breakline close/hold",
        "backwash close/hold",
        "three isolated seat first-run completions",
        "390x844 and 412x915 overflow/touch",
        "static MP3 playback and forced-missing fallback"
      ],
      viewports: ["1280x900", "390x844", "412x915"],
      consoleIssues: issues,
      unexpectedRequestFailures: requestFailures
    }, null, 2));
  } finally {
    if (browser) await browser.close().catch(() => {});
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
