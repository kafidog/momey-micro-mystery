"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const { setTimeout: delay } = require("node:timers/promises");
const { chromium } = require("C:\\Users\\USER\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const ROOT = path.resolve(__dirname, "..");
const WORKER_ROOT = path.resolve(__dirname, "..", "..", "worker-a9");
const STATIC_PORT = Number(process.env.MOMEY_A9_STATIC_PORT || 1590);
const WORKER_PORT = Number(process.env.MOMEY_A9_BROWSER_WORKER_PORT || 8790);
const REMOTE_FRONTEND = String(process.env.MOMEY_A9_FRONTEND_URL || "").replace(/\/$/, "");
const REMOTE_WORKER = String(process.env.MOMEY_A9_REMOTE_URL || "").replace(/\/$/, "");
const FRONTEND = REMOTE_FRONTEND || `http://127.0.0.1:${STATIC_PORT}`;
const WORKER = REMOTE_WORKER || `http://127.0.0.1:${WORKER_PORT}`;
const SCREENSHOTS = process.env.MOMEY_A9_SCREENSHOT_DIR || "";
const EVIDENCE = process.env.MOMEY_A9_FRONTEND_EVIDENCE || "";
const NPX_CLI = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js");
const BROWSER_EXECUTABLE = process.env.MOMEY_A9_BROWSER || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
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
  throw new Error("A9 service health timeout");
}

function query(room, missingAudio = false) {
  const url = new URL(FRONTEND + "/");
  url.searchParams.set("worker", WORKER);
  url.searchParams.set("audioFallbackMs", "120");
  if (room) url.searchParams.set("room", room);
  if (missingAudio) url.searchParams.set("missingAudio", "1");
  return url.toString();
}

async function phase(page, expected, timeout = 20000) {
  await page.waitForFunction((value) => window.__MOMEY_A9__?.getState()?.phase === value, expected, { timeout });
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
  await page.waitForFunction((value) => window.__MOMEY_A9__?.getState()?.control?.powerMode === value, mode, { timeout: 5000 });
}

async function waitControl(page, predicateSource, timeout = 8000) {
  await page.waitForFunction(new Function("return (" + predicateSource + ")")(), null, { timeout });
}

async function selectSeat(page, role) {
  await page.locator(`[data-role-select="${role}"]`).click();
  await page.locator("[data-takeover]").click();
  await page.waitForFunction((value) => window.__MOMEY_A9__?.getCurrentRole() === value && window.__MOMEY_A9__?.getState()?.currentSeat?.started, role, { timeout: 10000 });
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
    await Promise.all([phase(operations, "TRAINING"), phase(rescue, "TRAINING"), phase(safety, "TRAINING")]);
    await snapshot(safety, "03_role_training.png");
    await train(operations); await train(rescue); await train(safety);
    await Promise.all([phase(operations, "WINDOW1"), phase(rescue, "WINDOW1"), phase(safety, "WINDOW1")]);
    await snapshot(operations, "04_operations_control_window1.png");
    await clickPower(operations, "gate");
    await rescue.waitForFunction(() => window.__MOMEY_A9__.getState().control.railPowered === false);
    await snapshot(rescue, "05_cross_phone_rescue_unpowered.png");
    await clickPower(operations, "rail");
    await rescue.waitForFunction(() => window.__MOMEY_A9__.getState().control.railPowered === true);
    await snapshot(rescue, "06_rescue_power_effect.png");
    await snapshot(safety, "07_safety_rail_pressure_effect.png");
    await down(safety, "[data-hold-start=BRACE_START]");
    await operations.waitForFunction(() => window.__MOMEY_A9__.getState().control.safetySupportCoarse === "有人撐住");
    await snapshot(operations, "08_operations_sees_brace_effect.png");
    await down(rescue, "[data-hold-start=TROLLEY_START]");
    await delay(12000);
    await up(rescue); await up(safety);
    await clickPower(operations, "gate");
    await delay(10000);
    await clickPower(operations, "rail");
    await down(safety, "[data-hold-start=BRACE_START]");
    await down(rescue, "[data-hold-start=TROLLEY_START]");
    await delay(9000);
    await up(rescue); await up(safety);
    await snapshot(rescue, "09_trolley_checkpoint_effect.png");
    await clickPower(operations, "gate");
    await delay(3000);
    await snapshot(safety, "10_gate_recovery_after_rail.png");
    await Promise.all([phase(operations, "WINDOW2", 55000), phase(rescue, "WINDOW2", 55000), phase(safety, "WINDOW2", 55000)]);
    await safety.locator("[data-command=DEPLOY_SHIELD]").click();
    await clickPower(operations, "rail");
    await down(safety, "[data-hold-start=BRACE_START]");
    await down(rescue, "[data-hold-start=TROLLEY_START]");
    await delay(7000);
    await up(rescue);
    await snapshot(safety, "11_window2_live_operation.png");
    await clickPower(operations, "gate");
    await delay(6000);
    await up(safety);
    await Promise.all([phase(operations, "FINAL", 60000), phase(rescue, "FINAL", 60000), phase(safety, "FINAL", 60000)]);
    await snapshot(operations, "12_final_coordination_window.png");
    await rescue.locator("[data-command=SECURE_TROLLEY]").click();
    await down(safety, "[data-hold-start=BRACE_START]");
    await down(operations, "[data-hold-start=CLOSE_START]");
    await Promise.all([phase(operations, "OUTCOME", 20000), phase(rescue, "OUTCOME", 20000), phase(safety, "OUTCOME", 20000)]);
    await snapshot(operations, "13_outcome_390x844.png");
    await snapshot(rescue, "14_outcome_412x915.png");
    const outcome = await operations.evaluate(() => window.__MOMEY_A9__.getState().outcome);
    assert.equal(outcome.variant, "COORDINATED_CLOSE");
    assert.equal(await operations.locator("body").evaluate((node) => node.scrollWidth <= node.clientWidth), true);
    assert.equal(await rescue.locator("body").evaluate((node) => node.scrollWidth <= node.clientWidth), true);
    assert.deepEqual(consoleErrors, []);

    const fallbackRoom = (await (await fetch(WORKER + "/rooms", { method: "POST", headers: { Origin: REMOTE_FRONTEND ? "https://kafidog.github.io" : FRONTEND } })).json()).roomCode;
    const fallbackPages = await Promise.all(contexts.map((context) => context.newPage()));
    await Promise.all(fallbackPages.map((page) => page.goto(query(fallbackRoom, true), { waitUntil: "networkidle" })));
    await selectSeat(fallbackPages[0], "operations"); await selectSeat(fallbackPages[1], "rescue"); await selectSeat(fallbackPages[2], "safety");
    await Promise.all(fallbackPages.map((page) => phase(page, "TRAINING", 10000)));
    await Promise.all(fallbackPages.map((page) => page.close()));

    const report = { mode: REMOTE_FRONTEND && REMOTE_WORKER ? "production" : "local", room, viewports: ["390x844", "412x915", "390x844"], synchronizedSeats: 3, finalOutcome: outcome.variant, crossPhoneLinksObserved: 4, holdControls: ["TROLLEY", "BRACE", "CLOSE"], reconnectCoveredBy: "worker integration suite", missingAudioFallback: "PASS", horizontalOverflow: false, screenshots: SCREENSHOTS ? fs.readdirSync(SCREENSHOTS).filter((name) => name.endsWith(".png")).length : 0 };
    if (EVIDENCE) fs.writeFileSync(EVIDENCE, JSON.stringify(report, null, 2) + "\n", "utf8");
    console.log("A9 frontend three-device PASS " + JSON.stringify(report));
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
