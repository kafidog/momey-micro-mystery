"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const { setTimeout: delay } = require("node:timers/promises");
const { chromium } = require("C:\\Users\\USER\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const WORKER_ROOT = path.resolve(__dirname, "..", "..", "worker-a9r4");
const STATIC_PORT = Number(process.env.MOMEY_A9R4_STATIC_PORT || 1590);
const WORKER_PORT = Number(process.env.MOMEY_A9R4_BROWSER_WORKER_PORT || 8790);
const REMOTE_FRONTEND = String(process.env.MOMEY_A9R4_FRONTEND_URL || "").replace(/\/$/, "");
const REMOTE_WORKER = String(process.env.MOMEY_A9R4_REMOTE_URL || "").replace(/\/$/, "");
const FRONTEND = REMOTE_FRONTEND || `http://127.0.0.1:${STATIC_PORT}`;
const WORKER = REMOTE_WORKER || `http://127.0.0.1:${WORKER_PORT}`;
const SCREENSHOTS = process.env.MOMEY_A9R4_SCREENSHOT_DIR || "";
const EVIDENCE = process.env.MOMEY_A9R4_FRONTEND_EVIDENCE || "";
const PREMATURE_PULLS = Math.max(0, Math.min(2, Number(process.env.MOMEY_A9R4_PREMATURE_PULLS || 0)));
const NPX_CLI = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js");
const BROWSER_EXECUTABLE = process.env.MOMEY_A9R4_BROWSER || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
let staticServer;
let wrangler;

function contentType(file) {
  return ({ ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".mp3": "audio/mpeg" })[path.extname(file).toLowerCase()] || "application/octet-stream";
}

async function startServices() {
  if (!REMOTE_FRONTEND) {
    staticServer = http.createServer((request, response) => {
      const relative = decodeURIComponent((request.url || "/").split("?")[0]) === "/" ? "/index.html" : decodeURIComponent((request.url || "").split("?")[0]);
      const file = path.resolve(ROOT, "." + relative);
      if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { response.writeHead(404); response.end("Not found"); return; }
      response.writeHead(200, { "Content-Type": contentType(file), "Cache-Control": "no-store" });
      fs.createReadStream(file).pipe(response);
    });
    await new Promise((resolve, reject) => { staticServer.once("error", reject); staticServer.listen(STATIC_PORT, "127.0.0.1", resolve); });
  }
  if (!REMOTE_WORKER) {
    wrangler = spawn(process.execPath, [NPX_CLI, "--yes", "wrangler@4.120.0", "dev", "--local", "--ip", "127.0.0.1", "--port", String(WORKER_PORT)], { cwd: WORKER_ROOT, stdio: "ignore", windowsHide: true });
  }
  for (let i = 0; i < 100; i += 1) {
    try { if ((await fetch(WORKER + "/health")).ok) return; } catch {}
    await delay(250);
  }
  throw new Error("A9R4 service health timeout");
}

function query(room, missingAudio = false) {
  const url = new URL(FRONTEND + "/");
  url.searchParams.set("worker", WORKER);
  url.searchParams.set("audioFallbackMs", REMOTE_FRONTEND ? "15000" : "15000");
  if (room) url.searchParams.set("room", room);
  if (missingAudio) url.searchParams.set("missingAudio", "1");
  return url.toString();
}

async function phase(page, expected, timeout = 20000) {
  await page.waitForFunction((value) => window.__MOMEY_A9R4__?.getState()?.phase === value, expected, { timeout });
}

async function snapshot(page, name) {
  if (!SCREENSHOTS) return;
  fs.mkdirSync(SCREENSHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SCREENSHOTS, name), fullPage: true });
}

async function down(page, selector) {
  await page.locator(selector).waitFor({ state: "visible" });
  await page.evaluate((value) => {
    const node = document.querySelector(value);
    node.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerId: 7, pointerType: "touch", isPrimary: true }));
  }, selector);
}

async function up(page) {
  await page.evaluate(() => document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true, pointerId: 7, pointerType: "touch", isPrimary: true })));
}

async function train(page) { await down(page, "[data-training-hold]"); await delay(320); await up(page); }

async function clickPower(page, mode) {
  await page.locator(`[data-power="${mode}"]`).click();
  await page.waitForFunction((value) => window.__MOMEY_A9R4__?.getState()?.control?.powerMode === value, mode, { timeout: REMOTE_WORKER ? 15000 : 5000 });
}

async function waitControl(page, predicateSource, timeout = 8000) {
  await page.waitForFunction(new Function("return (" + predicateSource + ")")(), null, { timeout });
}

async function selectSeat(page, role) {
  await page.locator(`[data-role-select="${role}"]`).click();
  await page.locator("[data-takeover]").click();
  await page.waitForFunction((value) => window.__MOMEY_A9R4__?.getCurrentRole() === value && window.__MOMEY_A9R4__?.getState()?.currentSeat?.started, role, { timeout: 10000 });
}

async function browserRun() {
  await startServices();
  const browser = await chromium.launch({ headless: true, executablePath: BROWSER_EXECUTABLE });
  const contexts = [
    await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }),
    await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true }),
    await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }),
  ];
  const [operations, rescue, safety] = await Promise.all(contexts.map((context) => context.newPage()));
  const consoleErrors = [];
  for (const page of [operations, rescue, safety]) page.on("pageerror", (error) => consoleErrors.push(error.message));
  try {
    await operations.goto(query(), { waitUntil: "networkidle" });
    await snapshot(operations, "01_entry_390x844.png");
    await operations.locator("[data-create]").click();
    await operations.locator("[data-room-code]").waitFor();
    const room = (await operations.locator("[data-room-code]").textContent()).trim();
    assert.match(room, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    await Promise.all([rescue.goto(query(room), { waitUntil: "networkidle" }), safety.goto(query(room), { waitUntil: "networkidle" })]);
    await snapshot(rescue, "02_room_join_412x915.png");
    await selectSeat(operations, "operations");
    await selectSeat(rescue, "rescue");
    await selectSeat(safety, "safety");
    await operations.waitForFunction(() => {
      const audio = document.querySelector("#operator-audio");
      return /a9r_briefing_1\.mp3/.test(audio?.src || "") && !audio.paused;
    }, null, { timeout: 8000 });
    for (const beat of [1, 2, 3, 5, 6]) {
      await operations.waitForFunction((value) => window.__MOMEY_A9R4__?.getState()?.briefing?.beat === value, beat, { timeout: 20000 });
      const name = { 1: "03_briefing_place.png", 2: "04_briefing_lin_rui.png", 3: "05_briefing_gao_cheng.png", 5: "06_briefing_gate_tradeoff_map.png", 6: "07_briefing_team_objective.png" }[beat];
      await snapshot(operations, name);
    }
    await Promise.all([phase(operations, "TRAINING"), phase(rescue, "TRAINING"), phase(safety, "TRAINING")]);
    await snapshot(operations, "08_training_operations.png");
    await train(operations);
    await rescue.waitForFunction(() => window.__MOMEY_A9R4__?.getState()?.training?.effects?.railPower === true);
    await snapshot(rescue, "09_training_rescue_receives_power.png");
    await train(rescue);
    await safety.waitForFunction(() => window.__MOMEY_A9R4__?.getState()?.training?.effects?.gateLoad === true);
    await snapshot(safety, "10_training_safety_sees_pressure.png");
    await train(safety);
    await operations.waitForFunction(() => window.__MOMEY_A9R4__?.getState()?.training?.effects?.support === true);
    await Promise.all([phase(operations, "WINDOW1"), phase(rescue, "WINDOW1"), phase(safety, "WINDOW1")]);
    await operations.locator("[data-operator-compact=true]").waitFor({ timeout: 20000 });
    await Promise.all([rescue.locator("[data-operator-compact=true]").waitFor({ timeout: 10000 }), safety.locator("[data-operator-compact=true]").waitFor({ timeout: 10000 })]);
    const phaseBeforeReplay = await rescue.evaluate(() => window.__MOMEY_A9R4__.getState().phase);
    await rescue.locator("[data-replay]").click();
    assert.equal(await rescue.evaluate(() => window.__MOMEY_A9R4__.getState().phase), phaseBeforeReplay, "Replay must not advance shared state");
    await snapshot(operations, "11_live_operations_compact.png");
    await snapshot(rescue, "12_live_rescue_compact_412x915.png");
    await snapshot(safety, "13_live_safety_compact.png");
    for (const [role, page, selector] of [["operations", operations, ".power-switch"], ["rescue", rescue, "[data-hold-start=TROLLEY_START]"], ["safety", safety, "[data-hold-start=BRACE_START]"]]) {
      const control = await page.locator(selector).boundingBox();
      const viewport = page.viewportSize();
      assert.ok(control && control.y < viewport.height, `primary live control must begin inside the mobile viewport: ${role} control=${JSON.stringify(control)} viewport=${JSON.stringify(viewport)}`);
    }
    await clickPower(operations, "gate");
    await rescue.waitForFunction(() => window.__MOMEY_A9R4__.getState().control.railPowered === false);
    await clickPower(operations, "rail");
    await rescue.waitForFunction(() => window.__MOMEY_A9R4__.getState().control.railPowered === true);
    await down(safety, "[data-hold-start=BRACE_START]");
    await safety.waitForFunction(() => window.__MOMEY_A9R4__.getState().control.braceActive === true);
    assert.equal(await operations.evaluate(() => window.__MOMEY_A9R4__.getState().control.safetySupportCoarse), undefined, "Operations must not receive Safety readiness");
    assert.equal(await operations.evaluate(() => window.__MOMEY_A9R4__.getState().shared.trolley), undefined, "common header must not mirror Rescue state");
    assert.equal(await operations.evaluate(() => window.__MOMEY_A9R4__.getState().shared.pressure), undefined, "common header must not mirror Safety state");
    await down(rescue, "[data-hold-start=TROLLEY_START]");
    await delay(5000);
    await up(rescue); await up(safety);
    await clickPower(operations, "gate");
    await delay(5000);
    await clickPower(operations, "rail");
    await down(safety, "[data-hold-start=BRACE_START]");
    await down(rescue, "[data-hold-start=TROLLEY_START]");
    await delay(5000);
    await up(rescue); await up(safety);
    await clickPower(operations, "gate");
    await delay(5000);
    await clickPower(operations, "rail");
    await down(safety, "[data-hold-start=BRACE_START]");
    await down(rescue, "[data-hold-start=TROLLEY_START]");
    await delay(5000);
    await up(rescue); await up(safety);
    await Promise.all([phase(operations, "WINDOW2", 55000), phase(rescue, "WINDOW2", 55000), phase(safety, "WINDOW2", 55000)]);
    await safety.locator("[data-command=DEPLOY_SHIELD]").click();
    for (let cycle = 0; cycle < 5; cycle += 1) {
      if ((await operations.evaluate(() => window.__MOMEY_A9R4__.getState().phase)) !== "WINDOW2") break;
      await clickPower(operations, "balanced");
      await down(safety, "[data-hold-start=BRACE_START]");
      await down(rescue, "[data-hold-start=TROLLEY_START]");
      await delay(5000);
      await up(rescue); await up(safety);
      if ((await operations.evaluate(() => window.__MOMEY_A9R4__.getState().phase)) === "WINDOW2" && cycle < 4) {
        await clickPower(operations, "gate");
        await delay(7000);
      }
    }
    await Promise.all([phase(operations, "FINAL", 60000), phase(rescue, "FINAL", 60000), phase(safety, "FINAL", 60000)]);
    await snapshot(operations, "14_final_coordination.png");
    await snapshot(rescue, "15_final_rescue_local.png");
    if (PREMATURE_PULLS > 0) {
      await clickPower(operations, "gate");
      for (let pull = 0; pull < PREMATURE_PULLS; pull += 1) {
        await down(operations, "[data-hold-start=CLOSE_START]");
        await delay(1800);
        await up(operations);
        await operations.waitForFunction(() => window.__MOMEY_A9R4__.getState().control.closeCooldownMs > 0, null, { timeout: 5000 });
        await operations.waitForFunction(() => window.__MOMEY_A9R4__.getState().control.closeCooldownMs === 0, null, { timeout: 7000 });
      }
    }
    await rescue.locator("[data-command=SECURE_TROLLEY]").click();
    await clickPower(operations, "gate");
    await rescue.waitForFunction(() => window.__MOMEY_A9R4__.getState().control.secured === true, null, { timeout: 10000 });
    await safety.waitForFunction(() => {
      const control = window.__MOMEY_A9R4__.getState().control;
      return control.pressureWindowExact === "現在可關閘" && control.braceStaminaExact >= 50;
    }, null, { timeout: 45000 });
    await snapshot(safety, "16_final_safety_window.png");
    await down(safety, "[data-hold-start=BRACE_START]");
    await safety.waitForFunction(() => window.__MOMEY_A9R4__.getState().control.braceStableExact === true, null, { timeout: 8000 });
    assert.equal(await operations.evaluate(() => window.__MOMEY_A9R4__.getState().control.braceStableExact), undefined, "Operations still must rely on Safety's callout");
    assert.equal(await operations.evaluate(() => window.__MOMEY_A9R4__.getState().control.secured), undefined, "Operations still must rely on Rescue's callout");
    await down(operations, "[data-hold-start=CLOSE_START]");
    await Promise.all([phase(operations, "OUTCOME", 20000), phase(rescue, "OUTCOME", 20000), phase(safety, "OUTCOME", 20000)]);
    await snapshot(operations, "17_outcome_390x844.png");
    await snapshot(rescue, "18_outcome_412x915.png");
    const outcome = await operations.evaluate(() => window.__MOMEY_A9R4__.getState().outcome);
    assert.equal(outcome.variant, "COORDINATED_CLOSE");
    assert.equal(outcome.metrics.gateDamage, PREMATURE_PULLS * 24);
    assert.equal(outcome.details.recovery.reboundCount, PREMATURE_PULLS);
    assert.equal(await operations.locator("body").evaluate((node) => node.scrollWidth <= node.clientWidth), true);
    assert.equal(await rescue.locator("body").evaluate((node) => node.scrollWidth <= node.clientWidth), true);
    assert.equal(await operations.locator("[data-outcome-headline]").count(), 1);
    assert.equal(await operations.locator("[data-outcome-card]").count(), 3);
    assert.equal(await operations.locator("[data-contribution]").count(), 3);
    assert.equal(await operations.locator("body").evaluate((node) => !node.innerText.includes("只有本席先看到")), true);
    assert.equal(outcome.contributions.length, 3);
    assert.deepEqual(consoleErrors, []);

    const fallbackRoom = (await (await fetch(WORKER + "/rooms", { method: "POST", headers: { Origin: REMOTE_FRONTEND ? "https://kafidog.github.io" : FRONTEND } })).json()).roomCode;
    const fallbackPages = await Promise.all(contexts.map((context) => context.newPage()));
    await Promise.all(fallbackPages.map((page) => page.goto(query(fallbackRoom, true), { waitUntil: "networkidle" })));
    await selectSeat(fallbackPages[0], "operations"); await selectSeat(fallbackPages[1], "rescue"); await selectSeat(fallbackPages[2], "safety");
    await Promise.all(fallbackPages.map((page) => phase(page, "TRAINING", 10000)));
    await Promise.all(fallbackPages.map((page) => page.close()));

    const report = { mode: REMOTE_FRONTEND && REMOTE_WORKER ? "production" : "local", room, viewports: ["390x844", "412x915", "390x844"], synchronizedSeats: 3, briefingBeats: 6, trainingCrossPhoneLinksObserved: 3, liveCrossPhoneLinksObserved: 3, roleLocalProjectionLeakChecks: "PASS", operatorCompactAfterPlayback: true, finalOutcome: outcome.variant, prematurePulls: PREMATURE_PULLS, gateDamage: outcome.metrics.gateDamage, facilityCondition: outcome.details.gate.condition, holdControls: ["TROLLEY", "BRACE", "CLOSE"], reconnectCoveredBy: "worker integration suite", missingAudioFallback: "PASS", horizontalOverflow: false, screenshots: SCREENSHOTS ? fs.readdirSync(SCREENSHOTS).filter((name) => name.endsWith(".png")).length : 0 };
    if (EVIDENCE) fs.writeFileSync(EVIDENCE, JSON.stringify(report, null, 2) + "\n", "utf8");
    console.log("A9R4 frontend three-device PASS " + JSON.stringify(report));
  } finally {
    await Promise.all(contexts.map((context) => context.close().catch(() => {})));
    await browser.close().catch(() => {});
  }
}

(async () => {
  try { await browserRun(); }
  finally {
    if (staticServer) await new Promise((resolve) => staticServer.close(resolve));
    if (wrangler && process.platform === "win32") spawnSync("taskkill", ["/pid", String(wrangler.pid), "/T", "/F"], { stdio: "ignore" });
    else if (wrangler) wrangler.kill("SIGTERM");
  }
})().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
