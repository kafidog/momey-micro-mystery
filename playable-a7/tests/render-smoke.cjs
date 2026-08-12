const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

const root = path.resolve(__dirname, "..");
const modulePath = process.env.MOMEY_A7_PLAYWRIGHT_MODULE || "playwright";
let playwright;
try {
  playwright = require(modulePath);
} catch (error) {
  throw new Error("PLAYWRIGHT_MODULE_UNAVAILABLE: set MOMEY_A7_PLAYWRIGHT_MODULE to playwright/index.js; " + error.message);
}
const { chromium } = playwright;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg"
};

function startServer() {
  const server = http.createServer((request, response) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname); }
    catch (_) { response.writeHead(400).end(); return; }
    const relative = pathname.replace(/^\/playable-a7\/?/, "") || "index.html";
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
  for (let index = 0; index < clean.length; index += 1) {
    hash ^= clean.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 2 === 0 ? "breakline" : "backwash";
}

function seedFor(target) {
  for (let index = 0; index < 1000; index += 1) {
    const seed = "CASE" + index;
    if (profile(seed) === target) return seed;
  }
  throw new Error("seed not found: " + target);
}

const consoleIssues = [];
const requestFailures = [];
const expectedMissingAudio = new WeakSet();

function observe(page, label) {
  page.setDefaultTimeout(12000);
  page.on("console", (message) => {
    const expected = expectedMissingAudio.has(page) && /Failed to load resource.*404/i.test(message.text());
    if (["error", "warning"].includes(message.type()) && !expected) consoleIssues.push(`${label} ${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => consoleIssues.push(`${label} pageerror: ${error.message}`));
  page.on("requestfailed", (request) => {
    if (!expectedMissingAudio.has(page) || !/\.mp3(?:\?|$)/i.test(request.url())) {
      requestFailures.push(`${label} ${request.url()} ${request.failure()?.errorText || "failed"}`);
    }
  });
}

async function healthy(page, label) {
  const state = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    blank: document.body.innerText.trim().length < 30,
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
      return { text: node.textContent.trim(), width: Math.round(rect.width), height: Math.round(rect.height) };
    })
    .filter((item) => item.width < 48 || item.height < 48));
  assert.deepEqual(failures, [], label);
}

async function openPage(browser, url, viewport, label) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  observe(page, label);
  await page.goto(url, { waitUntil: "networkidle" });
  await healthy(page, label);
  return { context, page };
}

async function chooseDiagnostic(page, key) {
  await page.locator(`[data-diagnostic="${key}"]`).click();
  assert.equal(await page.locator(`[data-diagnostic="${key}"]`).getAttribute("aria-pressed"), "true");
  assert.equal(await page.locator("[data-role-start]").isEnabled(), true);
  await page.locator("[data-role-start]").click();
  assert.equal(await page.locator('[data-stage="OPERATE"]').count(), 1);
  await page.locator("[data-confirm-diagnostic]").click();
  assert.equal(await page.locator('[data-stage="RESULT"]').count(), 1);
  assert.equal(await page.locator("[data-result-bullets] li").count(), 2);
  assert.equal(await page.locator(".voice-panel").count(), 0, "diagnostic result is intentionally text-only");
}

async function advanceToDecision(page) {
  await page.locator("[data-share-result]").click();
  assert.equal(await page.locator('[data-stage="DISCUSS"]').count(), 1);
  assert.equal(await page.locator("[data-decision]").count(), 0);
  await page.locator("[data-group-gate]").click();
  assert.equal(await page.locator('[data-stage="DECIDE"]').count(), 1);
  assert.equal(await page.locator("[data-decision]").count(), 2);
  const decisionText = await page.locator(".decision-stage").innerText();
  for (const marker of ["林芮", "高承", "中央隔離閘", "西側救援軌道", "20 秒", "95 秒"]) assert.match(decisionText, new RegExp(marker));
  assert.doesNotMatch(decisionText, /死亡|永久缺氧|永久呼吸傷害/);
}

async function finishDecision(page, decision) {
  const alternate = decision === "close" ? "hold" : "close";
  await page.locator(`[data-decision="${alternate}"]`).click();
  await page.locator(`[data-decision="${decision}"]`).click();
  assert.equal(await page.locator("[data-confirm-decision]").isEnabled(), false);
  assert.equal(await page.locator("[data-consequence]").count(), 0);
  await page.locator("[data-agreement-confirm]").click();
  assert.equal(await page.locator("[data-confirm-decision]").isEnabled(), true);
  const label = await page.locator("[data-confirm-decision]").innerText();
  assert.match(label, decision === "close" ? /執行：現在關上中央隔離閘/ : /執行：讓中央隔離閘再開 95 秒/);
  await page.locator("[data-confirm-decision]").click();
  assert.equal(await page.locator('[data-stage="ENDING"]').count(), 1);
}

async function runFullBranch(browser, baseURL, seed, role, diagnostic, decision, expected, label) {
  const opened = await openPage(browser, `${baseURL}/role-${role}.html?seed=${seed}`, { width: 412, height: 915 }, label);
  try {
    const page = opened.page;
    await chooseDiagnostic(page, diagnostic);
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await page.locator('[data-stage="RESULT"]').count(), 1, label + " result refresh");
    await advanceToDecision(page);
    await page.locator(`[data-decision="${decision}"]`).click();
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await page.locator('[data-stage="DECIDE"]').count(), 1, label + " draft refresh");
    assert.equal(await page.locator(`[data-decision="${decision}"]`).getAttribute("aria-pressed"), "true");
    await finishDecision(page, decision);
    const consequence = await page.locator("[data-consequence]").innerText();
    assert.match(consequence, expected, `${label}: ${consequence}`);
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await page.locator('[data-stage="ENDING"]').count(), 1, label + " ending refresh");
    assert.match(await page.locator("[data-consequence]").innerText(), expected, label + " ending refresh");
    await healthy(page, label + " ending");
  } finally { await opened.context.close(); }
}

async function runAllDiagnostics(browser, baseURL, seeds) {
  const plans = [
    [1, "O1"], [1, "O2"], [2, "R1"], [2, "R2"], [3, "S1"], [3, "S2"]
  ];
  for (const seed of seeds) {
    for (const [role, diagnostic] of plans) {
      const label = `${profile(seed)}-${diagnostic}`;
      const opened = await openPage(browser, `${baseURL}/role-${role}.html?seed=${seed}-${diagnostic}`, { width: 390, height: 844 }, label);
      try {
        await chooseDiagnostic(opened.page, diagnostic);
        const text = await opened.page.locator("[data-result-bullets]").innerText();
        assert.match(text, /查到：/);
        assert.match(text, /仍不知道：/);
        await healthy(opened.page, label);
      } finally { await opened.context.close(); }
    }
  }
}

(async () => {
  const server = await startServer();
  const baseURL = `http://127.0.0.1:${server.address().port}/playable-a7`;
  const candidates = [
    process.env.MOMEY_A7_CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe"
  ].filter(Boolean);
  const executablePath = candidates.find((candidate) => fs.existsSync(candidate));
  const launchOptions = { headless: true };
  if (executablePath) launchOptions.executablePath = executablePath;
  let browser;
  try {
    browser = await chromium.launch(launchOptions);
    const breakSeed = seedFor("breakline");
    const backwashSeed = seedFor("backwash");

    const entryOpened = await openPage(browser, `${baseURL}/?seed=${breakSeed}`, { width: 390, height: 844 }, "entry");
    try {
      const page = entryOpened.page;
      assert.match(await page.title(), /MOMEY A7/);
      for (let beat = 1; beat <= 8; beat += 1) {
        assert.equal(await page.locator(`[data-intro-beat="${beat}"]`).count(), 1, `beat ${beat}`);
        assert.equal(await page.locator("[data-intro-beat]").count(), 1, `single beat ${beat}`);
        assert.equal(await page.locator(".role-link").count(), 0, `role links hidden ${beat}`);
        if (beat === 2) assert.match(await page.locator(".visual-label").innerText(), /林芮｜維修員｜高處避難台/);
        if (beat === 3) assert.match(await page.locator(".visual-label").innerText(), /高承｜閘門技師｜中央隔離閘東側/);
        if (beat === 6) {
          assert.equal(await page.locator('img[src="assets/facility-map.svg"]').count(), 1);
          const imageWidth = await page.locator('img[src="assets/facility-map.svg"]').evaluate((img) => img.getBoundingClientRect().width);
          assert.ok(imageWidth >= 300, "map width at mobile");
        }
        await touchTargets(page, `beat ${beat}`);
        await page.locator("[data-intro-next]").click();
        await page.waitForTimeout(40);
        assert.equal(await page.evaluate(() => window.scrollY), 0, `stage resets scroll ${beat}`);
      }
      assert.equal(await page.locator("[data-intro-complete]").count(), 1);
      assert.equal(await page.locator(".role-link").count(), 3);
      for (const href of await page.locator(".role-link").evaluateAll((links) => links.map((link) => link.href))) assert.match(href, new RegExp(`seed=${breakSeed}`));
      await page.reload({ waitUntil: "networkidle" });
      assert.equal(await page.locator("[data-intro-complete]").count(), 1, "entry refresh");
    } finally { await entryOpened.context.close(); }

    for (const role of [1, 2, 3]) {
      const opened = await openPage(browser, `${baseURL}/role-${role}.html?seed=FRESH-${role}`, { width: 390, height: 844 }, `fresh role ${role}`);
      try {
        assert.equal(await opened.page.locator('[data-stage="ROLE"]').count(), 1);
        assert.equal(await opened.page.locator("[data-diagnostic]").count(), 2);
        assert.equal(await opened.page.locator("[data-role-start]").isEnabled(), false);
        assert.equal(await opened.page.locator("[data-reference-open]").count(), 0);
        assert.equal(await opened.page.locator("[data-consequence]").count(), 0);
        await touchTargets(opened.page, `fresh role ${role}`);
      } finally { await opened.context.close(); }
    }

    const drawer = await openPage(browser, `${baseURL}/role-3.html?seed=${breakSeed}`, { width: 390, height: 844 }, "drawer");
    try {
      await drawer.page.locator('[data-diagnostic="S1"]').click();
      await drawer.page.locator("[data-role-start]").click();
      await drawer.page.locator("[data-reference-open]").click();
      assert.equal(await drawer.page.locator("[data-reference-dialog]").isVisible(), true);
      assert.equal(await drawer.page.locator('img[src="assets/facility-map.svg"]').count(), 1);
      assert.doesNotMatch(await drawer.page.locator("[data-reference-content]").innerText(), /事件結果|死亡|永久傷害/);
      await drawer.page.keyboard.press("Escape");
      assert.equal(await drawer.page.locator("[data-reference-dialog]").isVisible(), false);
    } finally { await drawer.context.close(); }

    await runAllDiagnostics(browser, baseURL, [breakSeed, backwashSeed]);
    await runFullBranch(browser, baseURL, breakSeed, 1, "O1", "close", /林芮.*死亡.*高承安全/s, "breakline close");
    await runFullBranch(browser, baseURL, breakSeed, 2, "R1", "hold", /林芮.*救回.*高承死亡/s, "breakline hold");
    await runFullBranch(browser, baseURL, backwashSeed, 1, "O2", "close", /林芮.*永久傷害.*高承安全/s, "backwash close");
    await runFullBranch(browser, baseURL, backwashSeed, 3, "S2", "hold", /林芮.*永久傷害前.*高承.*永久呼吸傷害/s, "backwash hold");

    const threeSeat = await Promise.all([1, 2, 3].map((role) => openPage(browser, `${baseURL}/role-${role}.html?seed=THREE-SEAT`, { width: 390, height: 844 }, `three seat ${role}`)));
    try {
      const keys = ["O1", "R1", "S1"];
      for (let index = 0; index < threeSeat.length; index += 1) {
        const page = threeSeat[index].page;
        await chooseDiagnostic(page, keys[index]);
        await advanceToDecision(page);
        await finishDecision(page, "close");
        assert.equal(await page.locator('[data-stage="ENDING"]').count(), 1);
        const stored = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("momey-a7:THREE-SEAT:")));
        assert.deepEqual(stored, [`momey-a7:THREE-SEAT:role-${index + 1}`]);
      }
    } finally { await Promise.all(threeSeat.map(({ context }) => context.close())); }

    const seedIsolation = await openPage(browser, `${baseURL}/role-1.html?seed=KEEP-SEED`, { width: 412, height: 915 }, "seed isolation");
    try {
      await seedIsolation.page.locator('[data-diagnostic="O1"]').click();
      await seedIsolation.page.locator("[data-role-start]").click();
      await seedIsolation.page.evaluate(() => localStorage.setItem("momey-a6r:protected", "keep"));
      await seedIsolation.page.goto(`${baseURL}/role-1.html?seed=NEW-SEED`, { waitUntil: "networkidle" });
      assert.equal(await seedIsolation.page.locator('[data-stage="ROLE"]').count(), 1);
      assert.equal(await seedIsolation.page.locator('[data-diagnostic][aria-pressed="true"]').count(), 0);
      await seedIsolation.page.locator('[data-diagnostic="O2"]').click();
      await seedIsolation.page.locator("[data-role-start]").click();
      await seedIsolation.page.locator("[data-troubleshooting] summary").click();
      await seedIsolation.page.locator("[data-reset]").click();
      const afterReset = await seedIsolation.page.evaluate(() => ({
        protected: localStorage.getItem("momey-a6r:protected"),
        newSeedKeys: Object.keys(localStorage).filter((key) => key.startsWith("momey-a7:NEW-SEED:")),
        keepSeedKeys: Object.keys(localStorage).filter((key) => key.startsWith("momey-a7:KEEP-SEED:"))
      }));
      assert.equal(afterReset.protected, "keep");
      assert.deepEqual(afterReset.newSeedKeys, []);
      assert.deepEqual(afterReset.keepSeedKeys, ["momey-a7:KEEP-SEED:role-1"]);
    } finally { await seedIsolation.context.close(); }

    const audio = await openPage(browser, `${baseURL}/?seed=AUDIO`, { width: 390, height: 844 }, "audio");
    try {
      await audio.page.locator("[data-replay-voice]").click();
      await audio.page.waitForTimeout(500);
      const audioState = await audio.page.locator("[data-audio]").evaluate((node) => ({ src: node.currentSrc, readyState: node.readyState }));
      assert.match(audioState.src, /a7_intro_01\.mp3$/);
      assert.ok(audioState.readyState >= 1, "audio metadata loads");
    } finally { await audio.context.close(); }

    const missing = await openPage(browser, `${baseURL}/?seed=MISSING&missingAudio=1`, { width: 390, height: 844 }, "missing audio");
    try {
      expectedMissingAudio.add(missing.page);
      await missing.page.locator("[data-replay-voice]").click();
      await missing.page.waitForTimeout(500);
      assert.match(await missing.page.locator("[data-audio-status]").innerText(), /音訊暫時無法播放，請看字幕/);
      expectedMissingAudio.delete(missing.page);
    } finally { await missing.context.close(); }

    const mobile412 = await openPage(browser, `${baseURL}/role-3.html?seed=MOBILE412`, { width: 412, height: 915 }, "mobile 412");
    try {
      await healthy(mobile412.page, "mobile 412");
      await touchTargets(mobile412.page, "mobile 412");
    } finally { await mobile412.context.close(); }

    assert.deepEqual(consoleIssues, [], consoleIssues.join(" | "));
    assert.deepEqual(requestFailures, [], requestFailures.join(" | "));
    console.log(JSON.stringify({
      status: "PASS",
      baseURL,
      browser: executablePath || "Playwright-managed browser",
      tests: [
        "8 sequential intro beats and role-link gate",
        "Lin/Gao identity labels and facility map",
        "three fresh role screens",
        "12 diagnostics across two fixed profiles",
        "four profile/decision consequences",
        "three isolated phone completions",
        "draft/change/group-confirm/lock",
        "refresh before and after confirmation",
        "seed isolation and scoped reset",
        "reference map and disclosure boundary",
        "390x844 and 412x915 overflow/touch",
        "static MP3 and forced-missing fallback"
      ],
      viewports: ["390x844", "412x915"],
      consoleIssues,
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
